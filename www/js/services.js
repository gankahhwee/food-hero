angular.module('starter.services', [])

//.value('endpoint', 'http://foodhero.me:8000')
.value('endpoint', 'http://localhost:8100')

.factory('Events', function($http, endpoint) {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var events = [{
    id: 0,
    name: 'Ben Sparrow',
    address: 'You on your way?',
    img: 'img/ben.png',
    latitude: 1.452561,
    longitude: 103.8166473
  }, {
    id: 1,
    name: 'Max Lynx',
    address: 'Hey, it\'s me',
    img: 'img/max.png',
    latitude: 1.4531618,
    longitude: 103.817999
  }, {
    id: 2,
    name: 'Adam Bradleyson',
    address: 'I should buy a boat',
    img: 'img/adam.jpg',
    latitude: 1.451864,
    longitude: 103.8186213
  }];

  return {
    all: function() {
      return events;
    },
      
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
          return {success:true, events:events};
        }
      )  
    },
      
    remove: function(event) {
      events.splice(events.indexOf(event), 1);
    },
      
    get: function(eventId) {
      for (var i = 0; i < events.length; i++) {
        if (events[i].id === parseInt(eventId)) {
          return events[i];
        }
      }
      return null;
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