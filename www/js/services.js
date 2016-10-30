angular.module('starter.services', [])

.value('host', 'http://foodhero.me:8000')
.value('endpoint', 'http://localhost:8100')

.factory('Location', function($cordovaGeolocation){
  var singaporeLatitude = 1.3147268,
      singaporeLongitude = 103.7069311,
      options = {timeout: 10000, enableHighAccuracy: true},
      geocoder = new google.maps.Geocoder();
  
  function geocodeAddress(address, callback) {
    geocoder.geocode({'address': address + ' Singapore'}, function(results, status) {
      if (status === 'OK') {
        callback(results);
      } else {
        console.log('Geocode was not successful for the following reason: ' + status);
      }
    });
  }
  return {
    getCurrentPosition: function(){
      return $cordovaGeolocation.getCurrentPosition(options).then(function(position){
        return position;
      }, function(error){
        console.log("Could not get location. Return default Singapore location.");
        //return {latitude:singaporeLatitude, longitude:singaporeLongitude, zoom:10, success:false};
      });
    },
    geocodeAddress: geocodeAddress
  }
})


.factory('Events', function($http, endpoint, $q, host, $interval, Location) {

  var events;
    
  $interval(function(){
    if(events){
      for(var i=0;i<events.length;i++){
        initTimeLeft(events[i]);
      }
    }
  },60000);
    
  var formatTimeLeftText = function(timeLeft, suffix){
    timeLeft = Math.floor(timeLeft);
    if(timeLeft < 1) return "";
    var txt = Math.floor(timeLeft) + " " + suffix;
    if(timeLeft > 1){
      txt += "s";
    }
    return txt + " ";
  }
    
  var initTimeLeft = function(event){
    var timeLeft = event.timeLeft = (event.endtime.getTime() - new Date().getTime()); // in miliseconds
    var minsLeft = timeLeft / 1000 / 60;
    var hoursLeft = minsLeft / 60;
    var daysLeft = hoursLeft / 24;
    event.timeLeftDisplay = formatTimeLeftText(daysLeft, "day") + 
        formatTimeLeftText(hoursLeft % 24, "hour") + 
        formatTimeLeftText(minsLeft % 60, "min");
  }
    
  var initEvent = function(event){
    // distance
    if(event.distance){
        event.distance = Math.round(event.distance * 1000)/1000;
    }
      
    // endtime
    event.endtime = new Date(event.endtime);
    initTimeLeft(event);
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

  return {
    find: function(latitude,longitude,radius,currentLocation){
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
              if(!currentLocation){
                event.distance = undefined;
              }
            }
            return {success:true, events:events};
          }
        }
      )  
    },
      
    remove: function(event) {
      events.splice(events.indexOf(event), 1);
    },
      
    add: function(data){
      return Location.getCurrentPosition().then(function(position){
        data.append("latitude", position.coords.latitude);
        data.append("longitude", position.coords.longitude);
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
                return response.data;
            }
            return {success:false};
          },
          function(response){
            return {success:false};
          }
        ) 
      })
    },
      
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
    }
  };
})

.factory('AuthService', ['$http', 'endpoint', '$cordovaOauth', '$q', function($http, endpoint, $cordovaOauth, $q) {
  var user;
  return {
      
    user: function(){
      if(user){
          return user;
      }
      if(typeof(Storage) != "undefined") {
        if(localStorage.getItem("token")){
          user = {
            username: localStorage.getItem("username"),
            meanlsShared: parseInt(localStorage.getItem("mealsShared")),
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
      localStorage.setItem("username", username);
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
            console.log('login response');
            console.log(JSON.stringify(response));
          if(response.data == "unauthorized"){
              return $q.reject('Unauthorized');
          }
          if(response.data && response.data.success){
            if(typeof(Storage) != "undefined") {
              localStorage.setItem("mealsShared", response.data.mealsShared);
              localStorage.setItem("mealsSaved", response.data.mealsSaved);
              localStorage.setItem("token", response.data.token);
            } else {
              //alert("Sorry, your browser does not support Web Storage...");
            }
          } else {
              return $q.reject(response.data ? response.data.error : '');
          }
        },
          function(response) {
              console.log('login error');
              console.log(JSON.stringify(response));
              
              return $q.reject(response.data ? response.data.error : 'Server error');
          }
      )
    },

    loginFB: function() {
        return $cordovaOauth.facebook("1759718310929584", ["email"])
            .then(function (response) {
                console.log('$cordovaOauth response:');
                console.log(JSON.stringify(response));
                return response.access_token;
            });
    },
        
    getFBProfile: function(token) {
        return $http.get("https://graph.facebook.com/v2.8/me", { params: { access_token: token, fields: "id,third_party_id", format: "json" }})
        .then(function(response) {
            console.log('Get fb profile response:');
            console.log(JSON.stringify(response));
            return {
                token: token,
                user_id: response.data.id,
                third_party_id: response.data.third_party_id
            };
        }, function(response) {
            console.log('Get fb profile error:');
            console.log(JSON.stringify(response));
            return $q.reject(response.data.error.message);
        });
    },

    loginFBServer: function(response) {
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
            data: {token:response.token, user_id:response.user_id, third_party_id:response.third_party_id}
        }).then(function(response){
            console.log('loginServer response');
            console.log(JSON.stringify(response));
            if (response.data == "unauthorized"){
                return $q.reject('Unauthorized');
            }
            if (response.data && response.data.success){
                if (typeof(Storage) != "undefined") {
                  localStorage.setItem("mealsShared", response.data.mealsShared);
                  localStorage.setItem("mealsSaved", response.data.mealsSaved);
                  localStorage.setItem("token", response.data.token);
                } else {
                  //alert("Sorry, your browser does not support Web Storage...");
                }
              } else {
                  return $q.reject(response.data ? response.data.error : '');
              }
            }
        );
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
}]);