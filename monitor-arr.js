import axios from 'axios';
import notifier from 'node-notifier';
import schedule from 'node-schedule';
import open from 'open';
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
            /** Notificacion verde si la respuesta es 200 OK */
            notifier.notify({
                title: 'ARR Activo',
                message: `El sistema en ${url} está respodiendo correctamente`,
                icon: './iconos/success.svg',
                
                sound: true
            })
        }
        
    } catch (error) {
        notifier.notify({
            title: 'ARR No Responde',
            message: `El sistema en ${url} no está respodiendo`,
            icon: './iconos/error.svg',
            sound: true
        })
    }
}

const abrirUrl = (url) => {
    notifier.on('click', () => {
        open(url)
    })
}

/** Programar la verificacion cada minuto */
schedule.scheduleJob('*/1 * * * *', () => {
    urls.forEach((url) => {
        checkURL(url);
        abrirUrl(url)
    })
})

console.log('Iniciando monitorizacion de ARR cada minuto...');
