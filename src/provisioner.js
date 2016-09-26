let assert = require('assert');
let taskcluster = require('taskcluster-client');

class WorkerType {
  // needs properties:
  //   - maxCapacity
  //   - minCapacity
  //   - scalingRatio

  async currentCapacity() {
  }
}

class Provisioner {
  constructor(opts) {
    assert(typeof opts.id === 'string');
    this.id = opts.id;

    assert(opts.instanceManagers);
    assert(Array.isArray(opts.instanceManagers));
    this.instanceMangers = opts.instanceManagers;

    this.queue = new taskcluster.Queue();
  }

  /**
   * Create the list of bids that we'll eventually submit
   *
   * Returns an integeger which represents the number of capacity units
   *
   */
  async determineChange(workerType) {
    // We need to store the totals somewhere
    let totals = {
      runningInstances: 0,
      pendingInstances: 0,
    };

    // Let's figure out how many running and pending things we have
    // according to each InstanceManager
    for (let im of this.instanceManagers) {
      let capacityOfIM = await im.currentCapacity(workerType);
      totals.runningInstances += capacityOfIM.runningInstances;
      totals.pendingInstances += capacityOfIM.pendingInstances;
    }

    // Now, let's figure out how many pending tasks we have.
    let pendingTasks = (await this.queue.pendingTasks()).pendingTasks;

    // Now, we'll figure out how much capacity to create.  Note that we
    // consider a pending instance to offset the number of pending tasks.  This
    // is because each pending task will eventually be taken care of by the
    // pending instance when it changes to running
    //
    // NOTE: Here's where we'd put in scalingRatio calculations
    let change = pendingTasks - totals.pendingInstances;

    return change;

  }

  /**
   * Return a list of bids that would satisfy the amount of capacity that needs
   * creation.  NOTE: This function should create at least the capacityToCreate
   * number, but exceed that number by no more than the capacity of a single
   * instance of any type's capacity
   */
  async createBids(workerType, capacityToCreate) {
    let bids = determineBids(workerType, capacityToCreate);
  }

  async loadWorkerTypes() {
    //Load and return the worker types
  }

  /**
   * Return a list of pending instances which would satisfy the amount of
   * capacity that needs deletion.  NOTE: This function should kill up to
   * capacityToDestroy and not one more.
   */
  async createKills(workerType, capacityToDestroy) {
  }

  /**
   * Take a list of bids and submit them
   */
  async submitBids(bids) {
    for (let bid of bids) {
      bid.instanceManager.requestCapacity(bid.launchConfig);
    }
  }

  async iterate() {
    // Update the internal state of all the instance managers
    await Promise.all(this.instanceManagers.map(im => im.updateInternalState()));
    await Promise.all(this.instanceManagers.map(im => im.preProvisionHook()));

    let workerTypes = await loadWorkerTypes();

    let outcomes = await Promise.all(workerTypes.map(workerType => {
      // An outcome is a list of creats and kills.  A create is an object in
      // the shape { instanceManager: InstanceManager, launchConfiguration } A
      // kill is an object in the shape 
      // { instanceManager: InstanceManager, instances: Array }
      let outcome = {
        creates: [],
        kills: [],
      }

      let change = this.determineChange(workerType);

      if (change > 0) {
        outcome.creates.push(await this.createBids(workerType, change));
      } else if (change < 0) {
        outcome.kills.push(await this.createKills(workerType, -change));
      }
      return outcome;
    });

    await Promise.all(this.instanceManagers.map(im => im.postProvisionHook()));
  }
}
