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

/** URLs a Monitorear */
const urls = [
    'https://www.bienlinea.bi.com.gt/test.asp',
    'https://www.bibanking.bi.com.gt/test.asp',
    'https://crm.bi.com.gt/test.asp',
    'https://agentesbiafiliados.bi.com.gt',
    'https://www.corporacionbi.com'
];

/** Archivo CSV */
const csvFilePath = path.join(__dirname, 'historico_fallos.csv');

/** Abrir el flujo de escritura de manera global */
let writeStream;
let csvFormatter;

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

/** Funcion para agregar un registro al CSV */
const appendToCSV = (registro) => {
    try {
        openCSVStream(); 
        csvFormatter.write(registro);
    } catch (error) {
        console.error('Error al manejar el archivo CSV: ', error);
    }
};

/** Funcion para verificar el estado de las URLs */
const checkURL = async (url) => {
    try {
        const response = await axios(url);
        if (response.status === 200) {
            console.log(`El sistema en ${url} está respondiendo correctamente`.green);
        }
    } catch (error) {
        const fechaHora = moment().format('YYYY-MM-DD HH:mm:ss');
        const estado = error.response ? error.response.status : (error.code || 'Sin respuesta');

        /** Guardar en el CSV */
        appendToCSV({ fechaHora, url, estado });

        notifier.notify({
            title: 'ARR No Responde',
            message: `El sistema en ${url} no está respondiendo. Fecha y Hora: ${fechaHora}`,
            icon: './iconos/error.svg',
            sound: false,
            appID: url
        });
        console.log(`El sistema en ${url} no está respondiendo - status: ${estado}`.red);
    }
};

/** Programar la verificacion cada minuto */
schedule.scheduleJob('*/1 * * * *', async () => {
    console.clear();
    const horaMinuto = moment().format('HH:mm');
    console.log(`URLs comprobados en el último minuto - Hora: ${horaMinuto}`.cyan);
    await Promise.all(urls.map(checkURL));
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
