angular.module('starter.filters', [])

.filter('timeleft', function() {
    
  var formatTimeLeftText = function(timeLeft, suffix){
    timeLeft = Math.floor(timeLeft);
    if(timeLeft < 1) return "";
    var txt = Math.floor(timeLeft) + " " + suffix;
    if(timeLeft > 1){
      txt += "s";
    }
    return txt + " ";
  }
    
  return function(datetime) {
    var timeLeft = (datetime.getTime() - new Date().getTime()); // in miliseconds
    var minsLeft = timeLeft / 1000 / 60;
    var hoursLeft = minsLeft / 60;
    var daysLeft = hoursLeft / 24;
    if (daysLeft >= 1) {
        return formatTimeLeftText(daysLeft, "day");
    } else if (hoursLeft >= 1) {
        return formatTimeLeftText(hoursLeft % 24, "hour") + 
            formatTimeLeftText(minsLeft % 60, "min");
    } else {
        return formatTimeLeftText(minsLeft % 60, "min");
    }
  };
})