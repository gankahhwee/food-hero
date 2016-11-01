angular.module('starter.services', [])

.value('host', 'http://foodhero.me:8000')
.value('endpoint', 'http://foodhero.me:8000')
//.value('endpoint', 'http://localhost:8100/api')

.factory('Location', function($cordovaGeolocation, $q, $timeout){
  var currentLocation,
      singaporePlaceId = 'ChIJdZOLiiMR2jERxPWrUs9peIg',
      singaporeLocation = new google.maps.LatLng(1.2839384,103.8492658);
      options = {timeout: 10000, enableHighAccuracy: true},
      geocoder = new google.maps.Geocoder();
  
  function geocodeAddress(address, callback, errorCallback) {
    if(address && address.toLowerCase().indexOf('Singapore') < 0){
        address += ", Singapore";
    }
    geocoder.geocode({'address': address}, function(results, status) {
      if (status === 'OK') { if(callback) callback(results);
      } else { if(errorCallback) errorCallback(); }
    });
  }
    
  function reverseGeocode(latlng, callback, errorCallback){
    geocoder.geocode({'location': latlng}, function(results, status) {
      if (status === 'OK') { if(callback) callback(results);
      } else { if(errorCallback) errorCallback(); }
    });
  }
    
  return {
    getDefaultLocation: function() {
        return singaporeLocation;
    },
    getCurrentPosition: function(reload){
      if(reload){
        currentLocation = undefined;
      }
      if(currentLocation){
        return $q.when(currentLocation);
      }
      return $cordovaGeolocation.getCurrentPosition(options).then(function(position){
        currentLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        $timeout(function(){
          currentLocation = undefined;
        },60000);
        return currentLocation;
      }, function(error){
        var message = "Could not get location.";
        console.log(message);
        return $q.reject(message);
      });
    },
    geocodeAddress: geocodeAddress,
    reverseGeocode: reverseGeocode
  }
})

.factory('Events', function($http, endpoint, $q, host, $interval, Location, $filter) {

  var events,
      goingEvents,
      newEvent;
    
  var initEvent = function(event){
    // distance
    if(event.distance){
        event.distance = Math.round(event.distance * 1000)/1000;
    }
      
    // endtime
    event.endtime = new Date(event.endtime);
  }
  
  var initEventImages = function(event){
    if(event.images) {
        return;
    }
    // images
    $http({
      method: 'POST',
      url: endpoint+'/get-all-images',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': localStorage.getItem("token")
      },
      transformRequest: function(obj) {
        var str = [];
        for(var p in obj)
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        return str.join("&");
      },
      data: {roomname:event.roomname}
    }).then(
      function(response){
        if(response.data && response.data.imgNames){
          for(var i=0;i<response.data.imgNames.length;i++){
            response.data.imgNames[i] = host + "/images/" + response.data.imgNames[i].filename; 
          }
          event.images = response.data.imgNames;
        }
      }
    ) 
  }
  
    var getGoingEvents = function() {
        if (typeof(goingEvents) == 'undefined') {
            var username = localStorage.getItem("username");
            goingEvents = JSON.parse(localStorage.getItem(username + "-going"));
            if (goingEvents == null)
                goingEvents = [];
            for(var i=0; i<goingEvents.length;i++){
                goingEvents[i].endtime = new Date(goingEvents[i].endtime);
            }
        }
        
        return goingEvents;
    }
    
    var saveGoingEvents = function(){
        var username = localStorage.getItem("username");
        var goingEventsString = JSON.stringify(goingEvents);
        localStorage.setItem(username + "-going", goingEventsString);
    }
    
    var getGoingEvent = function(eventId) {
        var matches = $filter('filter')(getGoingEvents(), {id:eventId});
        if (matches.length > 0)
            return matches[0];
        return null;
    }
    
    var updateGoingEvent = function(event) {
        var match = getGoingEvent(event.id);
        if (event.isUserGoing) {
            if (match != null) {
                goingEvents[goingEvents.indexOf(match)] = event;
            } else {
                goingEvents.push(event);
            }
        } else {
            if (match != null)
                goingEvents.splice(goingEvents.indexOf(match), 1);
        }
        
        saveGoingEvents();
    }

  return {
    find: function(latitude,longitude,radius){
      return $http({
        method: 'POST',
        url: endpoint+'/get-events',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': localStorage.getItem("token")
        },
        transformRequest: function(obj) {
          var str = [];
          for(var p in obj)
          str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
          return str.join("&");
        },
        data: {latitude:latitude,longitude:longitude,radius:radius}
      }).then(
        function(response){
          if(response.data && response.data.success && response.data.events){
            events = response.data.events;
            for(var i=0;i<events.length;i++){
              initEvent(events[i]);
                
              var match = getGoingEvent(events[i].id);
              if (match != null) {
                events[i].isUserGoing = true;
                updateGoingEvent(events[i]);
              }
            }
            newEventId = false;
            return events;
          }
        }
      )
    },
      
    getGoingEvents: function() {
        return $q.when(getGoingEvents());
    },
      
    add: function(data, event){
        data.append("username", localStorage.getItem("username"));
            
        return $http({
          method: 'POST',
          url: endpoint+'/post-events',
          headers: {
            'Content-Type': undefined,
            'Authorization': localStorage.getItem("token")
          },
          data: data
        }).then(
          function(response){
            if(response.data && response.data.success){
                event.username = localStorage.getItem("username");
                event.id = response.data.id;
                event.isUserGoing = true;
                if(!events){
                  events = [];
                }
                events.push(event);
                newEvent = event;
                updateGoingEvent(event);
                return response.data;
            }
            return {success:false};
          },
          function(response){
            return {success:false};
          }
        ); 
    },
    
    newEvent: function(){ return newEvent; },
    clearNewEvent: function() { newEvent = undefined },
      
    get: function(eventId) {
      if(events){
        //find from cache first
        for (var i = 0; i < events.length; i++) {
          if (events[i].id === parseInt(eventId)) {
            initEventImages(events[i]);
            return $q.when({success:true, event:events[i]});
          }
        }
      } else {
        events = [];
      }
      //can't find from cache, call API to retrieve the data
      return $http({
        method: 'POST',
        url: endpoint+'/get-event',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': localStorage.getItem("token")
        },
        transformRequest: function(obj) {
          var str = [];
          for(var p in obj)
          str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
          return str.join("&");
        },
        data: {event_id:eventId}
      }).then(
        function(response){
          if(response.data && response.data.success && response.data.event){
            initEvent(response.data.event);
            initEventImages(response.data.event);
            events.push(response.data.event);
            return {success:true, event:response.data.event};
          }
        }
      ) 
    },
      
    isUserGoing: function (eventId) {
        var match = getGoingEvent(eventId);
        return $q.when({going: (match != null)});
        
        /*return $http({
            method: 'POST',
            url: endpoint + '/is-user-going',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': localStorage.getItem("token")
            },
            transformRequest: function (obj) {
                var str = [];
                for (var p in obj)
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            },
            data: {
                event_id: eventId,
                username: localStorage.getItem("username")
            }
        }).then(
            function (response) {
                if (response.data && response.data.success) {
                    return {going: response.data.going};
                } else {
                    return $q.reject(response.data.error.message);
                }
            }
        )*/
    },
      
    goingEvent: function (event) {
        return $http({
            method: 'POST',
            url: endpoint + '/going-event',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': localStorage.getItem("token")
            },
            transformRequest: function (obj) {
                var str = [];
                for (var p in obj)
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            },
            data: {
                event_id: event.id,
                going: event.isUserGoing?1:0,
                username: localStorage.getItem("username")
            }
        }).then(
            function (response) {
                if (response.data && response.data.success) {
                    updateGoingEvent(event);
                    return;
                } else {
                    return $q.reject(response.data.error.message);
                }
            }
        )
    }
  };
})

.factory('AuthService', ['$http', 'endpoint', '$cordovaOauth', '$q', 'Events', function($http, endpoint, $cordovaOauth, $q, Events) {
  var user;
    
    function initUser(responseData, username) {
        localStorage.setItem("username", username);
        localStorage.setItem("mealsShared", responseData.mealsShared);
        localStorage.setItem("mealsSaved", responseData.mealsSaved);
        localStorage.setItem("token", responseData.token);
    }
    
  var functions = {
    user: function(){
      if(user){
          return user;
      }
      if(typeof(Storage) != "undefined") {
        if(localStorage.getItem("token")){
          user = {
            username: localStorage.getItem("username"),
            mealsShared: parseInt(localStorage.getItem("mealsShared")),
            mealsSaved: parseInt(localStorage.getItem("mealsSaved")),
            token: localStorage.getItem("token")
          };
          return user;
        }
      } else {
        //alert("Sorry, your browser does not support Web Storage...");
      }
    },
      
    register: function(username, email, password) {
      return $http.post(
          endpoint+'/register',
          {username:username,email:email,password:password}).then(
        function(response){
          return response.data;
        }
      );
    },
      
    login: function(username, password) {
      return $http({
        method: 'POST',
        url: endpoint+'/login',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        transformRequest: function(obj) {
          var str = [];
          for(var p in obj)
          str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
          return str.join("&");
        },
        data: {username:username,password:password}
      }).then(
        function(response){
          if(response.data == "unauthorized"){
              return $q.reject('Unauthorized');
          }
          if(response.data && response.data.success){
              initUser(response.data, username);
          } else {
              return $q.reject(response.data ? response.data.error : '');
          }
        },
          function(response) {
              return $q.reject(response.data ? response.data.error : 'Server error');
          }
      )
    },

    /*
     * Params: none
     * Return: promise
     *   Resolve params:
     *     - access_token: fb access token
     *   Reject params:
     *     - err: error message
     */
    loginFB: function() {
        return $cordovaOauth.facebook("1759718310929584", ["email"])
        .then(function (response) {
            return response.access_token;
        }, function(error) {
            if (error == 'The sign in flow was canceled')
                return $q.reject('canceled');
            else
                return $q.reject(error);
        });
    },

    /*
     * Params:
     *   - token: fb access token
     * Return: promise
     *   Resolve params:
     *     - token: fb access token
     *     - user_id: fb unique user id
     *     - third_party_id: fb third party id
     *   Reject params:
     *     - err: error message
     */
    getFBProfile: function(token) {
        return $http.get("https://graph.facebook.com/v2.8/me", { params: { access_token: token, fields: "id,third_party_id", format: "json" }})
        .then(function(response) {
            return {
                token: token,
                user_id: response.data.id,
                third_party_id: response.data.third_party_id
            };
        }, function(response) {
            return $q.reject(response.data.error.message);
        });
    },

    /*
     * Params:
     *   - token: fb access token
     *   - user_id: fb unique user id
     *   - third_party_id: fb third party id
     * Return: promise
     *   Resolve params: none
     *   Reject params:
     *     - err: error message
     */
    loginFBServer: function(params) {
        return $http({
            method: 'POST',
            url: endpoint+'/loginFB',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            transformRequest: function(obj) {
              var str = [];
              for(var p in obj)
              str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
              return str.join("&");
            },
            data: {token:params.token, user_id:params.user_id, third_party_id:params.third_party_id}
        }).then(function(response){
            if (response.data == "unauthorized"){
                return $q.reject('Unauthorized');
            }
            if (response.data && response.data.success){
                var username = params.user_id;
                console.log(username);
                initUser(response.data, username);
              } else {
                  return $q.reject(response.data ? response.data.error : '');
              }
            }, function(response) {
                if (!response.data)
                  return $q.reject('Server error');
                else
                  return $q.reject(response);
        });
    },
      
    /*
     * Params: none
     * Return: promise
     *   Resolve params:
     *     - email: Google user's email address
     *     - idToken: Google id token
     *     - serverAuthCode: Google serverAuthCode (to exchange for accessToken at server)
     *   Reject params:
     *     - err: error message
     */
    loginGG: function() {
        var deferred = $q.defer();
        window.plugins.googleplus.login({
            'scopes': '', // optional, space-separated list of scopes, If not included or empty, defaults to `profile` and `email`.
            'webClientId': '1065984441784-nmgooca8hn1l67320mj5oug03nkjsgoq.apps.googleusercontent.com',
            'offline': true,
        }, function (response) {
            deferred.resolve(
                {email:response.email,idToken:response.idToken,serverAuthCode:response.serverAuthCode});
        }, function (msg) {
            if (msg == '12501')
                deferred.reject('canceled');
            else
                deferred.reject(msg);
        });
        
        return deferred.promise;
    },

    // should be done at server - otherwise client secret is exposed to client
    /*
     * Params:
     *   - email: Google user's email address
     *   - idToken: Google id token
     *   - serverAuthCode: Google serverAuthCode (to exchange for accessToken at server)
     * Return: promise
     *   Resolve params:
     *     - email: Google user's email address
     *     - idToken: Google id token
     *     - accessToken: Google access token
     *   Reject params:
     *     - err: error message
     */
    getGGAccessToken: function(params) {
        if (typeof(GG_CLIENT_SECRET) == 'undefined')
            return $q.reject('Google client secret has not been set');
        
        return $http({
            method: 'POST',
            url: "https://www.googleapis.com/oauth2/v4/token",
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            transformRequest: function(obj) {
                var str = [];
                for(var p in obj)
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            },
            data: {
                code: params.serverAuthCode,
                client_id: '1065984441784-nmgooca8hn1l67320mj5oug03nkjsgoq.apps.googleusercontent.com',
                client_secret: GG_CLIENT_SECRET,
                grant_type: 'authorization_code'
            }
        })
        .then(function(response) {
            return {email:params.email,idToken:params.idToken,accessToken:response.data.access_token};
        }, function(response) {
            return $q.reject(response.data.error_description);
        });
    },
    
    /*
     * Params:
     *   - email: Google user's email address
     *   - idToken: Google id token
     *   - accessToken: Google access token
     * Return: promise
     *   Resolve params: none
     *   Reject params:
     *     - err: error message
     */
    loginGGServer: function(params) {
        return $http({
            method: 'POST',
            url: endpoint+'/loginGG',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            transformRequest: function(obj) {
              var str = [];
              for(var p in obj)
              str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
              return str.join("&");
            },
            data: {email:params.email, token:params.idToken, access_token:params.accessToken}
        }).then(function(response){
            if (response.data == "unauthorized"){
                return $q.reject('Unauthorized');
            }
            if (response.data /*&& response.data.success*/){
                var username = params.email.split('@')[0];
                console.log(username);
                initUser(response.data, username);
              } else {
                  return $q.reject(response.data ? response.data.error : '');
              }
            }, function(response) {
                if (!response.data)
                  return $q.reject('Server error');
                else
                  return $q.reject(response);
        });
    },
      
    logoutGG: function() {
        var deferred = $q.defer();
        window.plugins.googleplus.logout(function(msg) {
            deferred.resolve(msg);
        });
        return deferred.promise;
    },
      
    logout: function() {
        if (typeof(Storage) != "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            localStorage.removeItem("mealsShared");
            localStorage.removeItem("mealsSaved");
        }
        
        user = undefined;
  
        if ((typeof(window.plugins) != 'undefined') &&
            (typeof(window.plugins.googleplus) != 'undefined'))
            functions.logoutGG();
        
        return $q.when();
    },
      
    meals: function(){
      return $http({
        method: 'POST',
        url: endpoint+'/get-meals',
        headers: {'Authorization': localStorage.getItem("token")}
      }).then(
        function(response){
          if(response.data && response.data.mealsShared){
            if(typeof(Storage) != "undefined") {
              user.mealsShared = response.data.mealsShared;
              user.mealsSaved = response.data.mealsSaved;
              localStorage.setItem("mealsShared", response.data.mealsShared);
              localStorage.setItem("mealsSaved", response.data.mealsSaved);
            } else {
              //alert("Sorry, your browser does not support Web Storage...");
            }
            return {success:true};
          } else {
            return {success:response.data.success,error:response.data.error}
          }
        }
      )
    }
  };

  return functions;
}]);