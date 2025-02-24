const Hyperdrive = require('hyperdrive')
const Hyperswarm = require('hyperswarm')
const HypercoreID = require('hypercore-id-encoding')
const Corestore = require('corestore')
const Updater = require('pear-updater')
const path = require('path')

module.exports = async function bootstrap (key, directory = 'pear', {
  lock = true,
  bootstrap,
  onupdater = null
} = {}) {
  if (!key) throw new Error('key is required')

  const corestore = new Corestore(path.join(directory, 'corestores/platform'))
  const checkout = { key: HypercoreID.normalize(key), length: 0, fork: 0 }

  const u = new Updater(new Hyperdrive(corestore, checkout.key), {
    directory,
    checkout,
    lock: lock ? path.join(directory, 'lock') : null
  })

  const swarm = new Hyperswarm({ bootstrap })

  await u.ready()

  const topic = swarm.join(u.drive.discoveryKey, { server: false, client: true })
  swarm.on('connection', c => corestore.replicate(c))

  let serving = false

  // TODO: add an option for this in swarm
  swarm.dht.on('nat-update', function () {
    if (!swarm.dht.randomized && !serving) {
      serving = true
      swarm.join(u.drive.discoveryKey, { server: true, client: false }).flushed().then(() => topic.destroy())
    }
  })

  if (onupdater !== null) onupdater(u)

  await u.wait({ ...checkout, length: 1 })

  await swarm.destroy()
  await corestore.close()

  return await u.applyUpdate()
}
