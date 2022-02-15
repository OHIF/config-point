import { iteratee } from 'lodash'
import ConfigPoint from '../dist/index_bundle.js'
import assert from 'must'

describe('config-point', () => {
  it('has register', () => {

    const { testRegister } = ConfigPoint.register({
      testRegister: { simpleValue: 5 },
    })
    assert(testRegister.simpleValue).must.eql(5)
  })
})
