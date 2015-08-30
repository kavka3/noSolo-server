define({ "api": [
  {
    "type": "get",
    "url": "/discover_activities",
    "title": "Activity Search by preferences and radius",
    "group": "Activity",
    "name": "GeoSearch",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "userId",
            "description": "<p>user._id</p> "
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "long",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "lat",
            "description": ""
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          },
          {
            "group": "Success 200",
            "type": "json[]",
            "optional": false,
            "field": "usersInActivity",
            "description": "<p>returns activity._id &amp; all founded in activity users</p> "
          },
          {
            "group": "Success 200",
            "type": "json[]",
            "optional": false,
            "field": "activities",
            "description": "<p>returns all founded activities</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "errMessage",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Activity search example:",
        "content": "https://vast-plains-3834.herokuapp.com/discover_activities?userId=767240993367525&long=34.85992&lat=32.33292",
        "type": "url"
      }
    ],
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "Activity"
  },
  {
    "type": "post",
    "url": "/user_join_activity",
    "title": "User joins to Activity",
    "group": "Activity",
    "name": "activity_join",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "activityId",
            "description": "<p>:activity._id</p> "
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "userId",
            "description": "<p>:user._id</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "User joins example:",
        "content": "{\n\"activityId\": \"54ec4c54d293a903001e832d\",\n\"userId\":\"767240993367525\"\n}",
        "type": "json"
      }
    ],
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "activity",
            "description": "<p>return all activity fields</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "errMessage",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "Activity"
  },
  {
    "type": "post",
    "url": "/user_removed_from_activity",
    "title": "User removed from activity by creator",
    "group": "Activity",
    "name": "activity_leave",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "activityId",
            "description": "<p>:activity._id</p> "
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "userId",
            "description": "<p>:user._id</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "User leaves example:",
        "content": "{\n\"activityId\": \"54ec4c54d293a903001e832d\",\n\"userId\":\"767240993367525\"\n}",
        "type": "json"
      }
    ],
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "data",
            "description": "<p>:return object activity + users details</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "data",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "Activity"
  },
  {
    "type": "post",
    "url": "/user_leave_activity",
    "title": "User leaves Activity",
    "group": "Activity",
    "name": "activity_leave",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "activityId",
            "description": "<p>:activity._id</p> "
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "userId",
            "description": "<p>:user._id</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "User leaves example:",
        "content": "{\n\"activityId\": \"54ec4c54d293a903001e832d\",\n\"userId\":\"767240993367525\"\n}",
        "type": "json"
      }
    ],
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "data",
            "description": "<p>:return object activity + users details</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "data",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "Activity"
  },
  {
    "type": "post",
    "url": "/remove_activity",
    "title": "Remove Activity",
    "group": "Activity",
    "name": "activity_remove",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "activityId",
            "description": "<p>:activity._id</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Remove Activity example:",
        "content": "{\n\"_id\":\"54edf5df3aa33f03009ba039\"\n}",
        "type": "json"
      }
    ],
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "errMessage",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "Activity"
  },
  {
    "type": "get",
    "url": "/activity_un_search",
    "title": "Search by any activity fields",
    "group": "Activity",
    "name": "activity_universal_search",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "criteria",
            "description": "<p>criteria name</p> "
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "value",
            "description": "<p>criteria value</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Activity search example:",
        "content": "\nhttps://vast-plains-3834.herokuapp.com/activity_un_search?criteria=tags&value=Cards",
        "type": "link"
      }
    ],
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "activities",
            "description": "<p>returns all activity fields</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "errMessage",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "Activity"
  },
  {
    "type": "post",
    "url": "/activity_update",
    "title": "Update any activity fields",
    "group": "Activity",
    "name": "activity_update",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "_id",
            "description": "<p>:activity id</p> "
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "criteria",
            "description": "<p>:name of changing field</p> "
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "value",
            "description": "<p>:value of changing field</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Activity update example:",
        "content": "{\n\"_id\": \"54e7982f5749880300353e33\",\n\"criteria\": \"maxMembers\",\n\"value\": \"27\"\n}",
        "type": "json"
      }
    ],
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "activity",
            "description": "<p>return all activity fields</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "errMessage",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "Activity"
  },
  {
    "type": "post",
    "url": "/create_activity",
    "title": "Create activity",
    "group": "Activity",
    "name": "create_activity",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "ObjectId",
            "optional": false,
            "field": "_id",
            "description": "<p>fills by system</p> "
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "title",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "description",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "imageUrl",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "float[]",
            "optional": false,
            "field": "location",
            "description": "<p>in format: long;lat</p> "
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "creator",
            "description": "<p>user id</p> "
          },
          {
            "group": "Parameter",
            "type": "String[]",
            "optional": false,
            "field": "tags",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "String[]",
            "optional": true,
            "field": "joinedUsers",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "timeStart",
            "description": "<p>format in js Date format</p> "
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "timeEnd",
            "description": "<p>format in js Date format</p> "
          },
          {
            "group": "Parameter",
            "type": "Boolean",
            "optional": false,
            "field": "isApprovalNeeded",
            "defaultValue": "true",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "Boolean",
            "optional": false,
            "field": "isTimeFlexible",
            "defaultValue": "true",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "Boolean",
            "optional": false,
            "field": "isGroup",
            "defaultValue": "true",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "Boolean",
            "optional": false,
            "field": "isLocationSecret",
            "defaultValue": "true",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "Boolean",
            "optional": false,
            "field": "isTimeSecret",
            "defaultValue": "true",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "int",
            "optional": true,
            "field": "maxMembers",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "ObjectId",
            "optional": false,
            "field": "chatId",
            "description": "<p>system fills it automatically</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "activity",
            "description": "<p>returns all activity fields</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "errMessage",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Create activity example with minimum fields:",
        "content": "{\n\"title\": \"poker\",\n\"creator\": \"767240993367525\",\n\"location\": [\n   34.85992,\n   32.33292\n],\n\"timeFinish\": \"2015-02-22T12:40:00.192Z\",\n\"timeStart\": \"2015-02-22T19:00:00.189Z\",\n\"tags\": [\n   \"Cards\",\n   \"Home games\"\n]\n}",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "Activity"
  },
  {
    "type": "post",
    "url": "/join_approve",
    "title": "Send notification that user request approved",
    "group": "Notification",
    "name": "join_approve",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "userId",
            "description": "<p>:activity creator Id</p> "
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "activityId",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "addressee",
            "description": "<p>:joined user id</p> "
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "notificationId",
            "description": "<p>:id of activity like notification</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "data",
            "description": "<p>:null</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "errMessage",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Like Activity example:",
        "content": "{\n\"userId\":\"767240993367525\",\n\"activityId\":\"550989cc9179010300a9238e\",\n\"addressee\":\"test user2\",\n\"notificationId\": \"550bf50068e2bc40035bc198\"\n}",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "Notification"
  },
  {
    "type": "post",
    "url": "/join_disapprove",
    "title": "Send notification that user request rejected",
    "group": "Notification",
    "name": "join_disapprove",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "userId",
            "description": "<p>:activity creator Id</p> "
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "activityId",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "addressee",
            "description": "<p>:joined user id</p> "
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "notificationId",
            "description": "<p>:id of activity like notification</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "data",
            "description": "<p>:null</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "errMessage",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Like Activity example:",
        "content": "{\n\"userId\":\"767240993367525\",\n\"activityId\":\"550989cc9179010300a9238e\",\n\"addressee\":\"test user2\",\n\"notificationId\": \"550bf50068e2bc40035bc198\"\n}",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "Notification"
  },
  {
    "type": "post",
    "url": "/like",
    "title": "activity Send notification that user wants to join activity",
    "group": "Notification",
    "name": "like_activity",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "userId",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "activityId",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "addressee",
            "description": "<p>:activity creator Id</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "data",
            "description": "<p>:null</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "errMessage",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Like Activity example:",
        "content": "{\n\"userId\":\"test user1\",\n\"activityId\":\"550989cc9179010300a9238e\",\n\"addressee\":\"767240993367525\"\n}",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "Notification"
  },
  {
    "type": "post",
    "url": "/create_tag",
    "title": "Tag creation",
    "group": "Tag",
    "name": "tag_creation",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "_title",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "ObjectId[]",
            "optional": true,
            "field": "activities",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "json[]",
            "optional": true,
            "field": "tagDictionary",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": true,
            "field": "tagCategory",
            "description": ""
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "_title",
            "description": "<p>:_title</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "errMessage",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Create tag example with all fields:",
        "content": "{\n\"_title\": \"basketball\",\n\"tagDictionary\": [{\"ru\": \"баскетбол\"}, {\"he\": \"כדורסל\"}]\n}",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "Tag"
  },
  {
    "type": "post",
    "url": "/tag_dictionary",
    "title": "Return all tags",
    "group": "Tag",
    "name": "tag_dictionary",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "languages",
            "description": "<p>:[&#39;lang1&#39;, &#39;lang2&#39; ...]</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "data",
            "description": "<p>:{ language: [ {_title: String, name: String, tagCategory: [String,..] } ,..] }</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "errMessage",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Get Tag Dictionary example:",
        "content": "{\n\"languages\": [\"he\", \"ru\"]\n}",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "Tag"
  },
  {
    "type": "post",
    "url": "/signIn",
    "title": "Login loads User or creates new one",
    "group": "User",
    "name": "login",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "_id",
            "description": "<p>user social id</p> "
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "socialToken",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "ObjectId",
            "optional": false,
            "field": "noSoloId",
            "description": "<p>system fills it automatically</p> "
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "surname",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "familyName",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "Date",
            "optional": false,
            "field": "birthDate",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "gender",
            "description": "<p>male, female or unknown</p> "
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "imageUrl",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "float",
            "optional": true,
            "field": "firstGeoLogin",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "float",
            "optional": true,
            "field": "currentLocation",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "int",
            "optional": true,
            "field": "preferredAgeMin",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "int",
            "optional": true,
            "field": "preferredAgeMax",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "ObjectId[]",
            "optional": true,
            "field": "activitiesCreated",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "ObjectId[]",
            "optional": true,
            "field": "activitiesLiked",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "ObjectId[]",
            "optional": true,
            "field": "activitiesDisliked",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "ObjectId[]",
            "optional": true,
            "field": "tagsPreferences",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "String[]",
            "optional": true,
            "field": "userContacts",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "float",
            "optional": true,
            "field": "radius",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "int",
            "optional": true,
            "field": "ranking",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "int",
            "optional": true,
            "field": "rating",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "userLanguage",
            "defaultValue": "eng",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "systemLanguage",
            "defaultValue": "eng",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "about",
            "description": ""
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": true,
            "field": "settings",
            "description": "<p>:default: { &#39;joinApprovals&#39;: true, &#39;joinRequests&#39;: true, &#39;newActivities&#39; : true, &#39;newMessages&#39;: true }</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "userField",
            "description": "<p>returns all user fields</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "error",
            "description": "<p>returns error.message</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "User signin/creation example with minimum fields:",
        "content": "{\n\"_id\": \"526139373\",\n\"socialToken\": \"CAANEgpuoVP8BAJqACj3KM8ZB52Cx6ZAeDN0zfmF3xjeuDV5DYOLUCfxRl5wFupmgUQGkfIsteCaNj6mZBf942nBCb1eFXFdX1SajqNY6r1qip24hQgRvCG3WcwBLWyyrVujNMTIEb6CfBJdszssQZBjmOoZC8PXvuphL6cL5XhXGBZBmx0gYGh0XnTfrOpMWmSg7N6hIiYSHhleZC2ULZCIgJCkgmi6amm4ZD\",\n\"surname\": \"Pedro\",\n\"familyName\": \"Gusman\",\n\"birthDate\": \"1985-12-14T22:00:00.000Z\",\n\"gender\": \"male\",\n\"email\": \"pedro@redTLV.com\"\n}",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "User"
  },
  {
    "type": "get",
    "url": "/logout",
    "title": "Logout",
    "group": "User",
    "name": "logout",
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "User"
  },
  {
    "type": "get",
    "url": "/user_un_search",
    "title": "Search by any user fields",
    "group": "User",
    "name": "user_universal_search",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "criteria",
            "description": "<p>criteria name</p> "
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "value",
            "description": "<p>criteria value</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "User search example:",
        "content": "\nhttps://vast-plains-3834.herokuapp.com/user_un_search?criteria=gender&value=male",
        "type": "link"
      }
    ],
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          },
          {
            "group": "Success 200",
            "type": "json[]",
            "optional": false,
            "field": "users",
            "description": "<p>returns all founded users</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "errMessage",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "User"
  },
  {
    "type": "post",
    "url": "/user_update",
    "title": "Update any user fields",
    "group": "User",
    "name": "user_update",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "_id",
            "description": "<p>user facebook id</p> "
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "criteria",
            "description": "<p>name of changing field</p> "
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "value",
            "description": "<p>value of changing field</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "User update example:",
        "content": "{\n\"_id\": \"767240993367525\",\n\"criteria\": \"about\",\n\"value\":\"Si felix esse vis, este!\"\n}",
        "type": "json"
      }
    ],
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:success</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "user",
            "description": "<p>returns all user fields</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "errMessage",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "User"
  },
  {
    "type": "post",
    "url": "/file_upload",
    "title": "Uploads pictures for users and activities",
    "group": "Utilities",
    "name": "file_upload",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "type",
            "description": "<p>userId/activityId/newActivityId</p> "
          },
          {
            "group": "Parameter",
            "type": "json",
            "optional": false,
            "field": "_id",
            "description": "<p>:User._id/Activity._id/in case of newActivityId:empty</p> "
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "bucket",
            "description": "<p>: bucket</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "awsKey",
            "description": "<p>: awsKey</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "policy",
            "description": "<p>: policyBase64</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "signature",
            "description": "<p>: signature</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "fileName",
            "description": "<p>: fileName</p> "
          },
          {
            "group": "Success 200",
            "type": "json",
            "optional": false,
            "field": "activityId",
            "description": "<p>: activityId</p> "
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "result",
            "description": "<p>:error</p> "
          },
          {
            "group": "Error 4xx",
            "type": "json",
            "optional": false,
            "field": "errMessage",
            "description": "<p>:err.message</p> "
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Params obj example:",
        "content": "{\n\"type\": \"userId\",\n\"_id\": \"767240993367525\"\n}",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "C:/Users/Ignat/Documents/NoSolo/workbench/Server/routes/index.js",
    "groupTitle": "Utilities"
  }
] });