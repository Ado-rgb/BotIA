
import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import P from 'pino'
import fetch from 'node-fetch'
import { Boom } from '@hapi/boom'

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket.default({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    browser: ['AdonixIA-Bot', 'Chrome', '1.0.0']
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') return

    const from = msg.key.remoteJid
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    if (!body) return

    try {
      let res = await fetch(`https://apiadonix.vercel.app/api/adonix?q=${encodeURIComponent(body)}`)
      let json = await res.json()
      if (!json || !json.respuesta) return

      await sock.sendMessage(from, { text: json.respuesta })
    } catch (e) {
      console.error('❌ Error al consultar la API:', e)
      await sock.sendMessage(from, { text: '❌ Error con la IA, intenta más tarde.' })
    }
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
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
}

startBot()
