import axios from 'axios';
import notifier from 'node-notifier';
import schedule from 'node-schedule';
import colors from 'colors';
import moment from 'moment';
import fs from 'fs';
import fastCsv from 'fast-csv'

/** URLs a Monitorear */
const urls = [
    'https://www.bienlinea.bi.com.gt/test.asp',
    'https://www.bibanking.bi.com.gt/test.asp',
    'https://crm.bi.com.gt/test.asp'
]

/** Archivo CSV */
const csvFilePath = 'historico_fallos.csv';

/** Funcion para agregar un registro al CSV */
const appendToCSV = (registro) => {
        
        const ws = fs.createWriteStream(csvFilePath, { flags: 'a'});
    fastCsv
        .write([registro], { headers: !fs.existsSync(csvFilePath)}) // Agrega el encabezado solo si el archivo no existe
        .pipe(ws);
} 

/** Funcion para verificar el estado de las URLs */
const checkURL = async (url) => {
    try {
        const response = await axios(url)
        if(response.status === 200) {
            console.log(`El sistema en ${url} está respodiendo correctamente`.green)
        }
        
    } catch (error) {
        const fechaHora = moment().format('YYYY-MM-DD HH:mm:ss');
        const estado = error.response ? error.response.status : 'Sin respuesta';

        /** Guardar en el CSV */
        appendToCSV({ fechaHora, url, estado});

        notifier.notify({
            title: 'ARR No Responde',
            message: `El sistema en ${url} no está respodiendo`,
            icon: './iconos/error.svg',
            sound: false,
            appID: url
        })
        console.log(`El sistema en ${url} no está respondiendo`.red);
        
    }
}


/** Programar la verificacion cada minuto */
schedule.scheduleJob('*/1 * * * *', () => {
    console.clear()

    const horaMinuto = moment().format('HH:mm')

    console.log(`URLs comprados en el último minuto - Hora: ${horaMinuto}`.cyan);
    urls.forEach((url) => {
        checkURL(url);
    })
})

console.log('Iniciando monitorizacion de ARR cada minuto...');

