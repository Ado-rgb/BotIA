import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'

import P from 'pino'
import fetch from 'node-fetch'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket.default({
    version,
    logger: P({ level: 'silent' }),
    auth: state,
    browser: ['AdonixIA-Bot', 'Chrome', '1.0.0']
  })

  // Mostrar el QR manualmente
  sock.ev.on('connection.update', ({ qr, connection, lastDisconnect }) => {
    if (qr) {
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      let reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (reason === DisconnectReason.loggedOut) {
        console.log('💀 Bot cerrado porque se cerró la sesión.')
      } else {
        console.log('⚠️ Conexión cerrada, reconectando...')
        startBot()
      }
    } else if (connection === 'open') {
      console.log('✅ Bot conectado!')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') return

    const from = msg.key.remoteJid
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    if (!body) return

    try {
      const res = await fetch(`https://apiadonix.vercel.app/api/adonix?q=${encodeURIComponent(body)}`)
      const json = await res.json()
      if (!json || !json.respuesta) return

      await sock.sendMessage(from, { text: json.respuesta })
    } catch (e) {
      console.error('❌ Error al consultar la API:', e)
      await sock.sendMessage(from, { text: '❌ Error con la IA, intenta más tarde.' })
    }
  })
}

startBot()