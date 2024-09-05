import axios from 'axios';
import notifier from 'node-notifier';
import schedule from 'node-schedule';

/** URLs a Monitorear */
const urls = [
    'https://www.bienlinea.bi.com.gt/test.asp',
    'https://www.bibanking.bi.com.gt/test.asp',
    'https://crm.bi.com.gt/test.asp'
]

const notificacionMap = new Map();

/** Funcion para verificar el estado de las URLs */
const checkURL = async (url) => {
    try {
        const response = await axios.get(url)
        if(response.status === 200) {
            /** Notificacion verde si la respuesta es 200 OK */
            const notificacionID = notifier.notify({
                title: 'ARR Activo',
                message: `El sistema en ${url} está respodiendo correctamente`,
                icon: './iconos/success.svg',
                sound: false,
                appID: url
            })
            notificacionMap.set(notificacionID, url);
        }
        
    } catch (error) {
        const notificacionID = notifier.notify({
            title: 'ARR No Responde',
            message: `El sistema en ${url} no está respodiendo`,
            icon: './iconos/error.svg',
            sound: false,
            appID: url
        })

        notificacionMap.set(notificacionID, url);
    }
}


/** Programar la verificacion cada minuto */
schedule.scheduleJob('*/1 * * * *', () => {
    urls.forEach((url) => {
        checkURL(url);
    })
})

console.log('Iniciando monitorizacion de ARR cada minuto...');

