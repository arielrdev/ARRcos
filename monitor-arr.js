import axios from 'axios';
import notifier from 'node-notifier';
import schedule from 'node-schedule';
import colors from 'colors';
import moment from 'moment';
import fs from 'fs';
import fastCsv from 'fast-csv';
import path from 'path';
import { fileURLToPath } from 'url';

/** Obtener el directorio actual  */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Archivo de URLs */
const urlsFilePath = path.join(__dirname, 'data.txt');

/** Archivo CSV */
const csvFilePath = path.join(__dirname, 'historico_fallos.csv');

/** Abrir el flujo de escritura de manera global */
let writeStream;
let csvFormatter;

/** Arreglos */
const lastErrorState = new Map();
/** Estructura en memoria para los resúmenes diarios */
let resumenDiario = {};

const openCSVStream = () => {
    if (!writeStream) {
        writeStream = fs.createWriteStream(csvFilePath, { flags: 'a' });
        console.log("Flujo de escritura CSV abierto.".yellow);

        // Inicializar el formateador CSV y conectarlo al writeStream
        csvFormatter = fastCsv.format({ headers: !fs.existsSync(csvFilePath) });
        csvFormatter.pipe(writeStream);
    }
};

/** Cerrar el flujo de escritura cuando sea necesario */
const closeCSVStream = () => {
    if (writeStream && csvFormatter) {
        csvFormatter.end();  // Cerrar el formateador CSV
        writeStream.end();   // Cerrar el flujo del archivo
        writeStream = null;
        csvFormatter = null;
        console.log("Flujo de escritura CSV cerrado.".yellow);
    }
};

/** Función para leer las URLs desde el archivo */
const loadURLs = () => {
    try {
        const data = fs.readFileSync(urlsFilePath, 'utf8');
        return data.split('\n').map(url => url.trim()).filter(url => url);
    } catch (error) {
        console.log('Error al leer el archivo.txt', error);
        return [];
    }
}

/** Funcion para agregar un registro al CSV */
const appendToCSV = (registro) => {
    try {
        openCSVStream(); 
        csvFormatter.write(registro);
    } catch (error) {
        console.error('Error al manejar el archivo CSV: ', error);
    }
};

/** Función para evitar errores duplicados */
const shouldLogError = (url, estado) => {
    const lastState = lastErrorState.get(url);
    if (lastState !== estado) {
        lastErrorState.set(url, estado);
        return true;
    }

    return false;
}

/** Funcion para verificar el estado de las URLs */
const checkURL = async (url) => {
    try {
        const response = await axios(url);
        if (response.status === 200) {
            console.log(`El sistema en ${url} está respondiendo correctamente`.green);
            lastErrorState.delete(url); // Elimina el estado anterior si está activo
        }
    } catch (error) {
        const fechaHora = moment().format('YYYY-MM-DD HH:mm:ss');
        let estado = '';
        let mensajeError = '';

        /** Clasificación de Errores */
        if (error.response) {
            /** Errores HTTP */
            estado = error.response.status;
            mensajeError = `HTTP Error ${estado}: ${error.response.statusText}`;
        } else if (error.code) {
            /** Errores de Red */
            estado = error.code;

            switch (error.code) {
                case 'ENOTFOUND':
                    mensajeError = 'No se puede resolver la URL (ENOTFOUND)';
                    break;

                case 'ECONNREFUSED':
                    mensajeError = 'Conexión rechazada por el servidor (ECONNREFUSED)';
                    break;

                case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
                    mensajeError = 'Certificado SSL no verificado (UNABLE_TO_VERIFY_LEAF_SIGNATURE)';
                    break;

                default:
                    mensajeError = `Error de red desconocido: ${error.code}`;
                    break;
            }
        } else {
            // Errores desconocidos
            estado = 'Sin respuesta';
            mensajeError = 'Error desconocido';
        }

        /** Verificar si el error debe registrarse */
        if (shouldLogError(url, estado)) {
            /** Guardar en el CSV - Tiempo Real */
            appendToCSV({
                tipoRegistro: 'TiempoReal',
                fechaHora,
                url,
                estado,
                mensajeError,
                totalErrores: '',
                detalles: ''
            });

            /** Acumular en el resumen diario */
            if(!resumenDiario[url]) {
                resumenDiario[url] = {}
                resumenDiario[url][mensajeError] = (resumenDiario[url][mensajeError] || 0) + 1;
            }

            console.log(`Problema con ${url} - ${mensajeError}`.red);
        } else {
            console.log(`Error repetido en ${url} - ${mensajeError}`.red);
        }
    }
};

const generarResumenDiario = () => {
    const fechaHoy = moment().format('YYYY-MM-DD');

    for (const [url, errores] of Object.entries(resumenDiario)) {
        const detalles = Object.entries(errores)
            .map(([mensaje, conteo]) => `${mensaje}: ${conteo} veces`)
            .join(', ');
        
        const totalErrores = Object.values(errores).reduce((acc, val) => acc + val, 0);

        appendToCSV({
            tipoRegistro: 'Resumen',
            fechaHora: fechaHoy,
            url,
            estado: '',
            mensajeError: '',
            totalErrores,
            detalles
        });
    }
    console.log(`Resumen diario generado para el ${fechaHoy}`.cyan);
    resumenDiario = {} // Limpiar el resumen para el próximo día
}


/** Programar la verificacion cada minuto */
schedule.scheduleJob('*/1 * * * *', async () => {
    console.clear();
    const horaMinuto = moment().format('HH:mm');
    console.log(`URLs comprobados en el último minuto - Hora: ${horaMinuto}`.cyan);
    
    const urls = loadURLs();
    await Promise.all(urls.map(checkURL));
});


/** JOB - Genera Resumen al final del día */
schedule.scheduleJob('59 23 * * *', () => {
    generarResumenDiario();
});

console.log('Iniciando monitorización de ARR cada minuto...');

/** Cerrar el flujo de escritura CSV cuando la aplicación termine */
process.on('SIGINT', () => {
    console.log('Deteniendo la aplicación...');
    closeCSVStream(); // Cerrar el flujo de escritura CSV antes de salir
    process.exit();
});

process.on('SIGTERM', () => {
    console.log('Aplicación finalizada por el sistema.');
    closeCSVStream(); // Cerrar el flujo de escritura CSV antes de salir
    process.exit();
});
