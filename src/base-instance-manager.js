// A base instance.  All instances must have a state of either 'pending' or
// 'running'.  These states are not supposed to represent all states for all
// backends, rather it's the state that the provisioner will use to decide
// whether or not to count this instance against running or pending capacity
class Instance {
  constructor(opts) {
    assert(typeof opts.state === 'string');
    this.state = opts.state;
  }
}

class RunningInstance extends Instance {
  constructor(opts) {
    super({state: 'running'});
  }
}

class PendingInstance extends Instance {
  constructor(opts) {
    super({state: 'pending'});
  }
}

class LaunchConfiguration {
  constructor(opts) {
  }
}

/**
 * Abstract base class for all InstanceManagers.  An InstanceManager should represent
 * one 'cloud' provider.  Example: all of ec2, all of digital ocean.  Subdivisions
 * of a cloud should be handled inside the implementing class.
 */
class InstanceManager {

  constructor(opts) {
    this.id = opts.id;
  }

  /**
   * Return the current capacity counts.  The answer is in 'capacity' units,
   * which is the node * the number of jobs that node type is marked as being
   * able to run concurrently.
   *
   * Return value is an object in the shape
   * {
   *  runningCapacity: Integer,
   *  pendingCapacity: Integer,
   * }
   */
  async currentCapacity(workerType) {
    throw new Error('unimplemented');
  }

  /**
   * Request that the backend create a list of LaunchConfigurations.  If state
   * about submitted requests needs to be stored because of eventual consistency,
   * this must be handled inside this method and be reflected in currentCapacity
   */
  async requestCapacity(launchConfig) {
    throw new Error('unimplemented');
  }

  /**
   * Given a list of RunningInstances, attempt to kill them.
   */
  async killInstance(runningInstances) {
    throw new Error('unimplemented');
  }

  /**
   * Given a list of PendingInstances, attempt to cancel their creation
   */
  async cancelRequests(pendingInstances) {
    throw new Error('unimplemented');
  }

  /**
   * Take the given LaunchConfigurations and return the one that is cheapest
   */
  async cheapestOption(launchConfigs) {
    throw new Error('unimplemented');
  }

  /**
   * Trigger an update to the internal state of this InstanceManager.  This is
   * a hook that'd be called by the Provisioner
   */
  async updateInternalState() {
    throw new Error('unimplemented');
  }

  /**
   * This is a hook to perform house-keeping tasks that should be performed
   * before making provisioning choices.
   */
  async preProvisioningHook() {
  }

  /**
   * This is a hook to perform house-keeping tasks that should be performed
   * after making provisioning choices
   */
  async postProvisioningHook() {
  }
}

