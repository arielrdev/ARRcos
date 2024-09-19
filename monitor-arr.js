import axios from 'axios';
import notifier from 'node-notifier';
import schedule from 'node-schedule';
import colors from 'colors';

/** URLs a Monitorear */
const urls = [
    'https://www.bienlinea.bi.com.gt/test.asp',
    'https://www.bibanking.bi.com.gt/test.asp',
    'https://crm.bi.com.gt/test.asp'
]


/** Funcion para verificar el estado de las URLs */
const checkURL = async (url) => {
    try {
        const response = await axios.get(url)
        if(response.status === 200) {
            console.log(`El sistema en ${url} está respodiendo correctamente`.green)
        }
        
    } catch (error) {
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
    console.log('URLs comprobados en el último minuto'.cyan);
    urls.forEach((url) => {
        checkURL(url);
    })
})

console.log('Iniciando monitorizacion de ARR cada minuto...');

