import { hasOwnProperty, typeNumber, isFn, get, noop } from 'react-core/util';
import { createElement } from 'react-core/createElement';
import { Renderer } from 'react-core/createRenderer';

var fakeApp = {
    app: {
        globalData: {}
    }
};
function _getApp () {
    if (isFn(getApp)) {
        return getApp();
    }
    return fakeApp;
}
//获取redux-react中的connect包裹下的原始实例对象 相同点Connect.WrappedComponent, 不支持react-redux4, 7
//  https://cdn.bootcss.com/react-redux/7.1.0-alpha.1/react-redux.js
//  https://cdn.bootcss.com/react-redux/6.0.1/react-redux.js  fiber.child.child
//  https://cdn.bootcss.com/react-redux/5.1.1/react-redux.js  fiber.child
export function getWrappedComponent(fiber, instance) {
    var ctor = instance.constructor;
    if (ctor.WrappedComponent) {
        if (ctor.contextTypes) {
            instance = fiber.child.stateNode;
        } else {
            instance = fiber.child.child.stateNode;
        }
    } 
    return instance;
}

if (typeof getApp === 'function') {
    // 这时全局可能没有getApp
    _getApp = getApp; // esline-disabled-line
}

export { _getApp };
export function callGlobalHook (method, e) {
    var app = _getApp();
    if (app && app[method]) {
        return app[method](e);
    }
}

export var delayMounts = [];
export var usingComponents = [];
export var registeredComponents = {};

export function getCurrentPage () {
    var app = _getApp();
    return app.$$page && app.$$page.reactInstance;
}
export function _getCurrentPages() {
    console.warn('getCurrentPages存在严重的平台差异性，不建议再使用'); // eslint-disable-line
    if (typeof getCurrentPages !== 'undefined') {
        return getCurrentPages(); // eslint-disable-line
    }
    return [];
}

// 用于保存所有用miniCreateClass创建的类，然后在事件系统中用到
export var classCached = {};

export function updateMiniApp (instance) {
    if (!instance || !instance.wx) {
        return;
    }
    var data = safeClone({
        props: instance.props,
        state: instance.state || null,
        context: instance.context
    });
    if (instance.wx.setData) {
        instance.wx.setData(data);
    } else {
        updateQuickApp(instance.wx, data);
    }
}
export function refreshComponent (instances, wx, uuid) {
    if(wx.disposed){
        return 
    }
    let pagePath = Object(_getApp()).$$pagePath;
    for (let i = 0, n = instances.length ;i < n; i++) {
        let instance = instances[i];
        //处理组件A包含组件时B，当出现多个A组件，B组件会串的问题
        if (instance.$$pagePath === pagePath && !instance.wx && instance.instanceUid === uuid) {
            var fiber = get(instance)
            if(fiber.disposed){
               console.log("fiber.disposed by nanachi");
               continue;
            }
            //处理mobx //fiber.type.name == 'Injector' && fiber.child.name === fiber.name会被压缩掉
            if(fiber.child && fiber.type.wrappedComponent){
                instance = fiber.child.stateNode;
            } else {
                // 处理redux与普通情况
                instance = getWrappedComponent(fiber, instance);
            }
            
            instance.wx = wx;
            wx.reactInstance = instance;
            updateMiniApp(instance);
            return instances.splice(i, 1);
        }
    }
}

export function detachComponent () {
    let t = this.reactInstance;
    this.disposed = true;
    if (t) {
        t.wx = null;
        this.reactInstance = null;
    }
}

function updateQuickApp (quick, data) {
    for (var i in data) {
        quick.$set(i, data[i]);
    }
}

function isReferenceType (val) {
    return typeNumber(val) > 6;
}

export function runFunction (fn, a, b) {
    if (isFn(fn)) {
        fn.call(null, a, b);
    }
}

export function runCallbacks ( cb, success, fail, complete ) {
    try {
        cb();
        success && success();
    } catch (error){
        fail && fail(error);
    } finally {
        complete && complete();
    }
}

export function useComponent(props) {
    var is = props.is;
    var clazz = registeredComponents[is];
    props.key = this.key != null ? this.key :  (props['data-instance-uid'] || new Date() - 0);
    //delete props.is;
    clazz.displayName = is;
    if (this.ref !== null) {
        props.ref = this.ref;
    }
    var owner = Renderer.currentOwner;
    if (owner){
        Renderer.currentOwner = get(owner)._owner;
    }
    return createElement(clazz, props);
}

export function handleSuccess(options, success = noop, complete = noop, resolve = noop) {
    success(options);
    complete(options);
    resolve(options);
}
  
export function handleFail(options, fail = noop, complete = noop, reject = noop) {
    fail(options);
    complete(options);
    reject(options);
}
 

function safeClone (originVal) {
    let temp = originVal instanceof Array ? [] : {};
    for (let item in originVal) {
        if (hasOwnProperty.call(originVal, item)) {
            let value = originVal[item];
            if (isReferenceType(value)) {
                if (value.$$typeof) {
                    continue;
                }
                temp[item] = safeClone(value);
            } else {
                temp[item] = value;
            }
        }
    }
    return temp;
}

