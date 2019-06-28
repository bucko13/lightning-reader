const { setup } = require('radiks-server')
const { aes } = require('bcrypto')
const app = require('../index.js')
const {
  getPublicKey,
  getUsersList,
  getUserKey,
  getDocument,
  validateMacaroons,
} = require('./helpers')
const { decryptECIES } = require('blockstack/lib/encryption')

let RadiksController

app.use('/api/radiks', async (req, res, next) => {
  if (!RadiksController)
    RadiksController = await setup({
      mongoDBUrl: process.env.MONGODB_URI,
    })
  return RadiksController(req, res, next)
})

app.get('/api/radiks/key', async (req, res) => {
  const pubKey = getPublicKey(req.query.id)
  res.json({ pubKey })
})

app.get('/api/radiks/document/:docId', async (req, res) => {
  const { docId } = req.params
  const document = await getDocument(docId)
  const { content, dischargeMacaroon } = req.query
  const rootMacaroon = req.session.macaroon

  if (!document)
    return res
      .status(404)
      .json({ message: `No document found for id ${docId}` })

  const { encryptedContent: data, keyId } = document
  const { encryptedKey: aesKey } = await getUserKey(keyId)

  // if no request for content then just return metadata
  if (!content)
    return res.status(200).json({
      title: document.title,
      author: document.author,
      _id: document._id,
    })
  // if requesting content but no root macaroon cookie present in request
  // then an invoice needs to be requested first to get the macaroon for auth
  else if (!rootMacaroon)
    return res.status(400).json({
      message: 'Missing macaroon. Request an invoice before requesting content',
    })
  // request for content but no discharge macaroon passed in query param
  // likely means client still needs to pay ln node and verify payment status
  else if (!dischargeMacaroon)
    return res.status(400).json({
      message:
        'Missing 3rd party macaroon from payment node. \
Make sure invoice is paid and you have received a discharge macaroon',
    })
  else if (!data && document.title)
    return res.status(202).json({
      title: document.title,
      author: document.author,
      _id: document._id,
      decryptedContent: '[Content is protected]',
    })
  else if (!data)
    return res
      .status(404)
      .json({ message: 'no encrypted content for requested document' })

  // if we've gotten this far we know that we have all necessary
  // macaroons as well as available document data.
  try {
    // make sure request is authenticated by validating the macaroons
    validateMacaroons(rootMacaroon, dischargeMacaroon, docId)
  } catch (e) {
    // if throws with an error message that includes text "expired"
    // then payment is required again
    if (e.message.toLowerCase().includes('expired'))
      return res.status(402).json({ message: e.message })
    return res.status(400).json({ message: e.message })
  }

  // TODO: the below fails if content was never encrypted
  const [encryptedContent, iv] = data.split(':::')

  const decryptedKey = decryptECIES(process.env.APP_PRIVATE_KEY, aesKey)
  const decryptedContent = aes.decipher(
    Buffer.from(encryptedContent, 'hex'),
    Buffer.from(decryptedKey, 'hex'),
    Buffer.from(iv, 'hex')
  )
  res.json({ ...document, decryptedContent: decryptedContent.toString() })
})

app.get('/api/radiks/users', async (req, res) => {
  const users = await getUsersList()
  res.json({ users })
})

module.exports = app
