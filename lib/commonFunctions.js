/**
 * Created by Ignat on 3/30/2015.
 */

var log = require('../lib/log.js')(module)
underscore = require('underscore');

var common = {
    isEmpty: function(obj){
        return underscore.isEmpty(obj);
    },

    deepObjClone: function(obj){
        return JSON.parse(JSON.stringify(obj));
    },

    objectsEquality: function(a, b){
        // Create arrays of property names
        var aProps = Object.getOwnPropertyNames(a);
        var bProps = Object.getOwnPropertyNames(b);

        // If number of properties is different,
        // objects are not equivalent
        if (aProps.length != bProps.length) {
            return false;
        }

        for (var i = 0; i < aProps.length; i++) {
            var propName = aProps[i];

            // If values of same property are not equal,
            // objects are not equivalent
            if (a[propName] !== b[propName]) {
                return false;
            }
        }

        // If we made it this far, objects
        // are considered equivalent
        return true;
    },
    //return boolean
    arrayDifference: function (arr1, arr2){
        if(arr1.length != arr2.length){

            return true;
        }
        if(arr1.length == 0 && arr2.length == 0){

            return false;
        }
        if(Object.prototype.toString.call(arr1[0]) === '[object Object]'
            && Object.prototype.toString.call(arr2[0]) === '[object Object]'){

            for(var i = 0; i < arr1.length; i++){
                if(!common.objectsEquality(arr1[i], arr2[i])){

                    return true;
                }
            }

            return false;
        }
        return arr1.filter(function(e){
            if(arr2.indexOf(e) === -1)
                return true;
        })
    },

    objectType: function(key){
        var result;
        if(Object.prototype.toString.call(key) === '[object Array]'){
            result = 'array';
        }
        else if(Object.prototype.toString.call(key) === '[object Object]'){
            result = 'object';
        }
        else if(Object.prototype.toString.call(key) === '[object Date]') {
            result = 'date';
        }
        else{
            result = 'single';
        }
        return result;
    },

    saveArchiveInstance: function(oldAvatar, self){
        for(var key in oldAvatar._doc){
            if(key != '_id' && key != '__v' && key != 'parentId'
                && key != 'created' && key != 'notifications' && key != 'lastVisit'){
                var keyValue = common.objectType(oldAvatar[key][(oldAvatar[key].length - 1)].createdValue);
                switch (keyValue) {
                    case 'array':{
                        var arr1 = oldAvatar[key][(oldAvatar[key].length - 1)].createdValue,
                            arr2 = self[key];
                        if (arr1.length < arr2.length) {
                            arr2 = oldAvatar[key][(oldAvatar[key].length - 1)].createdValue;
                            arr1 = self[key];
                        }
                        if (common.arrayDifference(arr1, arr2)) {
                            oldAvatar[key].set(oldAvatar[key].length, ({createdValue: self[key],
                                created: new Date().toUTCString()
                            }));
                        }
                    };break;
                    case 'object':{
                        if (!common.objectsEquality(
                                oldAvatar[key][(oldAvatar[key].length - 1)].createdValue, self[key])){
                            oldAvatar[key].set(oldAvatar[key].length, ({ createdValue: self[key],
                                created: new Date().toUTCString() } ) ); }
                    };break;
                    case 'single':{
                        if (oldAvatar[key][(oldAvatar[key].length - 1)].createdValue != self[key]){
                            oldAvatar[key].set(oldAvatar[key].length, ({createdValue: self[key],
                                created: new Date().toUTCString()
                            }));
                        }
                    };break;
                    case 'date':{
                        if(!(!(oldAvatar[key][(oldAvatar[key].length - 1)].createdValue > self[key])
                            && !(oldAvatar[key][(oldAvatar[key].length - 1)].createdValue < self[key]))){
                            oldAvatar[key].set(oldAvatar[key].length, ({createdValue: self[key],
                                created: new Date().toUTCString()
                            }));
                        }
                    };break;
                    default: break;
                }
            }
        }
        oldAvatar.save(function(err,result){
            if(err){ log.error(err); }
            else{ ; }
        });
    },
    //return array that not include intersections with arr1
    getArraysDifference: function(arr1, arr2){

        return underscore.difference(arr1, arr2);
    },

    getArraysIntersection: function(arr1, arr2){

        return underscore.intersection(arr1, arr2);
    },

    existInArray: function(arr, value){
        var res = underscore.find(arr, function(num){ return num == value });
        if(res == undefined){ return false; }
        else{ return true; }
    },

    isEqual: function(obj1, obj2){
        return underscore.isEqual(obj1, obj2);
    },

    union: function(arr1, arr2){
        return underscore.union(arr1, arr2);
    }
};

module.exports = common;