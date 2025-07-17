// Bot Adonix IA hecho por Ado 😎
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import fetch from 'node-fetch'
import * as fs from 'fs'

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('session')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe || m.key.remoteJid === 'status@broadcast') return

    const text = m.message.conversation || m.message.extendedTextMessage?.text
    if (!text) return

    // Reaccionar como IA
    await sock.sendMessage(m.key.remoteJid, {
      react: { text: "🤖", key: m.key }
    })

    // Llamar API Adonix
    try {
      const res = await fetch(`https://apiadonix.vercel.app/api/adonix?q=${encodeURIComponent(text)}`)
      const json = await res.json()
      if (!json || !json.respuesta) throw 'Sin respuesta válida'

      await sock.sendMessage(m.key.remoteJid, {
        text: `🤖 *Adonix IA responde:*

${json.respuesta}`
      }, { quoted: m })

    } catch (e) {
      console.error('Error IA:', e)
      await sock.sendMessage(m.key.remoteJid, {
        text: '⚠️ Error al obtener respuesta de Adonix IA.'
      }, { quoted: m })
    }
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('conexión cerrada. ¿Reconectar?', shouldReconnect)
      if (shouldReconnect) {
        startBot()
      }
    } else if (connection === 'open') {
      console.log('✅ Bot Adonix IA conectado')
    }
  })
}

startBot()