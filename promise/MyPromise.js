// promiseA+规范 https://promisesaplus.com/
// promise是一个拥有then方法的对象或函数，其行为符合本规范
// 一个promise的状态必须为以下三种之一：Pending、Fulfilled、Rejected

// 参考 从零开始手写Promise https://zhuanlan.zhihu.com/p/144058361
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

function Promise(executor) {
  var _this = this;
  this.state = PENDING;
  this.value = undefined;
  this.reason = undefined;
  this.onFulfilled = [];
  this.onRejected = [];

  function resolve(value) {
    if (_this.state === PENDING) {
      _this.state = FULFILLED;
      _this.value = value;
      _this.onFulfilled.forEach(fn => fn(value));
    }
  }
  
  function reject(reason) {
    if (_this.state === PENDING) {
      _this.state = REJECTED;
      _this.reason = reason;
      _this.onRejected.forEach(fn => fn(reason));
    }
  }

  try{
    executor(resolve, reject);
  } catch(e) {
    reject(e);
  }
}

// onFulfilled 和 onRejected 都是可选参数。
// 如果 onFulfilled 不是函数，其必须被忽略。如果 onRejected 不是函数，其必须被忽略

// then 方法必须返回一个 promise 对象
// promise2 = promise1.then(onFulfilled, onRejected);
// then的执行过程
// 1:如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行下面的 Promise 解决过程：[[Resolve]](promise2, x)
// 2:如果 onFulfilled 或者 onRejected 抛出一个异常 e ，则 promise2 必须拒绝执行，并返回拒因 e
// 3:如果 onFulfilled 不是函数且 promise1 成功执行， promise2 必须成功执行并返回相同的值
// 4:如果 onRejected 不是函数且 promise1 拒绝执行， promise2 必须拒绝执行并返回相同的据因
Promise.prototype.then = function(onFulfilled, onRejected) {

  var _this = this;
  onFulfilled = typeof onFulfilled === 'function'? onFulfilled: value => value;
  onRejected = typeof onRejected === 'function'? onRejected: reason => { throw reason };
  
  var promise2 = new Promise((resolve, reject) => {
    
    if (_this.state === FULFILLED) {
      setTimeout(() => {
        try {
          let x = onFulfilled(_this.value);
          resolvePromise(promise2, x, resolve, reject);
        } catch (error) {
          reject(error);
        }
      });
    }
    if (_this.state === REJECTED) {
      setTimeout(() => {
        try {
          let x = onRejected(_this.reason);
          resolvePromise(promise2, x, resolve, reject);
        } catch (error) {
          reject(error);
        }
      });
    }
    if(_this.state === PENDING) {
      _this.onFulfilled.push(()=> {
        setTimeout(() => {
          try {
            let x = onFulfilled(_this.value);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      });
      _this.onRejected.push(()=>{
        setTimeout(() => {
          try {
            let x = onRejected(_this.reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      });
    }
  })
  return promise2;
};


// Promise解决过程
/**
 * 
 * Promise 解决过程是一个抽象的操作，其需输入一个 promise 和一个值，
 * 我们表示为 [[Resolve]](promise, x)，如果 x 有 then 方法且看上去像一个 Promise，
 * 解决程序即尝试使 promise 接受 x 的状态；否则其用 x 的值来执行 promise。
 * 
 * 1 x 与 promise 相等
 * 如果 promise 和 x 指向同一对象，以 TypeError 为据因拒绝执行 promise
 * 2 x 为 Promise
 *  如果 x 处于等待态， promise 需保持为等待态直至 x 被执行或拒绝
 *  如果 x 处于执行态，用相同的值执行 promise
 *  如果 x 处于拒绝态，用相同的据因拒绝 promise
 * 3 x 为对象或函数
 * 把 x.then 赋值给 then
 * 如果取 x.then 的值时抛出错误 e ，则以 e 为据因拒绝 promise
 * 如果 then 是函数，将 x 作为函数的作用域 this 调用之。
 * 传递两个回调函数作为参数，第一个参数叫做 resolvePromise 第二个参数叫做 rejectPromise:
 * 如果 resolvePromise 以值 y 为参数被调用，则运行 [Resolve]
 * 如果 rejectPromise 以据因 r 为参数被调用，则以据因 r 拒绝 promise
 * 如果 resolvePromise 和 rejectPromise 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
 * 如果 then 不是函数，以 x 为参数执行 promise
 * 如果 x 不为对象或者函数，以 x 为参数执行 promise
 */
function resolvePromise(promise2, x, resolve, reject) {
  // 如果 promise 和 x 指向同一对象，以 TypeError 为据因拒绝执行 promise
  if (promise2 === x) {
    reject(new TypeError('Chaining cycle'));
  }

  if (x && (typeof x === 'object' || typeof x === 'function')) {
    // x 为对象或函数
    let used;
    try {
      let then = x.then;
      if (typeof then === 'function') {
        then.call(x, (y) => {
          if (used) return;
          used = true;
          resolvePromise(promise2, y, resolve, reject);
        }, (r) => {
          if (used) return;
          used = true;
          reject(r);
        })
      } else {
        if (used) return;
        used = true;
        resolve(x);
      }
    } catch (error) {
      if (used) return;
      used = true;
      reject(error);
    }
  } else {
    // x 不为对象或者函数，以 x 为参数执行 promise
    resolve(x);
  }
}

Promise.defer = Promise.deferred = function () {
  let dfd = {}
  dfd.promise = new Promise((resolve,reject)=>{
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
}
module.exports = Promise;