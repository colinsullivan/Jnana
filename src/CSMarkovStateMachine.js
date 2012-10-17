
/**
 *  @class  CSMarkovStateMachine  A state machine that utilizes provided
 *  `MarkovTable` instances to generate events at each state.
 **/
function CSMarkovStateMachine(params) {
  var key;

  if (typeof params === "undefined" || params === null) {
    params = {};
  }

  // `MarkovTable` instances to use to generate events, keyed by the event
  // parameter the table will generate.
  this._tables = {};

  // array of keys to use as state event properties
  this._stateKeys = [];
}

CSMarkovStateMachine.prototype = {
  /**
   *  @param  String        propertyName  The name of the property on the
   *  state event that the table will be used to generate.
   *  @param  MarkovTable   propertyTable  The table used to generate the
   *  given property on the state event.
   **/
  add_table: function (propertyName, propertyTable) {
    this._stateKeys.push(propertyName);
    this._tables[propertyName] = propertyTable;
  },

  // generate and return next state
  next: function () {
    var state = {},
      stateKeys = this._stateKeys,
      tables = this._tables,
      table,
      key,
      i;

    // for each table, generate state
    for (i = 0; i < stateKeys.length; i++) {
      key = stateKeys[i];
      table = tables[key];

      state[key] = table.next();
    }

    return state;
  }

};
