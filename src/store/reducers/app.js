import { Map } from 'immutable'

import { SET_PUB_KEY, SET_AES_KEY } from '../constants'

const init = Map({ pubKey: '', aesKey: '' })

export default (state = init, action) => {
  const { type, payload } = action

  switch (type) {
    case SET_PUB_KEY:
      return state.set('pubKey', payload)

    case SET_AES_KEY:
      return state.set('aesKey', payload)

    default:
      return state
  }
}
