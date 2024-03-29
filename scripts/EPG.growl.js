/*jslint adsafe:false, 
 bitwise: true, 
 browser:true, 
 cap:false, 
 debug:false,
 eqeqeq: true,
 evil: false,
 forin: false,
 fragment:false, 
 laxbreak:false, 
 nomen:true, 
 passfail:false, 
 plusplus:true, 
 rhino:false, 
 undef:true, 
 white:false, 
 widget:false */

/*extern EPG,
 widget */

if (EPG.debug)
{
  EPG.debug.inform("EPG.growl.js loaded");
}
/**
 * @name EPG.growl
 * @static
 * @type object
 * @description Displays growl notifications if growl (www.growl.info) with growlnotify is installed.
 */
EPG.growl = function(Debug, Translator)
{
  // Private Variables
  var that,
  hasNotCheckedForGrowlYet = true,
  userHasGrowlInstalled = false,
  timers = [],
  callbacks = [],
  pathToGrowl = "/usr/local/bin/growlnotify",
  pathToEPGIcon = "$HOME/Library/Xmltv/grabber/Icon.png";; 
  
  // Private methods
  /**
   * @memberOf EPG.growl
   * @name growlCheck
   * @function 
   * @description Checks if the growl notification test failed. If an error was found, growl is not installed and no further attempts will be made to send messages via growl.
   * @private
   * @param {object} systemCall Represents the object recieved after a system call has finished running (in the Dashboard case growlnotify was called via widget.system).
   * @param {function} callback Function to tell weather growl is installed or not.
   */
  function growlCheck(systemCall, callback) 
  {
    var index;
    try
    {
      hasNotCheckedForGrowlYet = false;
      if(systemCall.errorString)
      {
        userHasGrowlInstalled = false;
        Debug.warn("growlCheck: User does not have growlnotify installed in /usr/local/bin :-(");
      }
      else
      {
        Debug.inform("growlCheck: growlnotify is installed in /usr/local/bin!");
        userHasGrowlInstalled = true;
      }
      
      if(callback)
      {
        callback(userHasGrowlInstalled);
      }
    }
    catch (error)
    {
      Debug.alert("Error in growl.growlCheck: " + error);
    }
  }
  
  /**
    * @memberOf EPG.growl
    * @name growlFinished
    * @function
    * @description Runs after a growl notification has been shown.
    * @private
    * @param {object} systemCall Represents the object recieved after a system call has finished running.
    */
  function growlFinished(systemCall) 
  {
    var index;
    try
    {
      if(systemCall.errorString)
      {
        Debug.alert("Error when sending growl notification :-(\n" + systemCall.errorString);
      }
    }
    catch (error)
    {
      Debug.alert("Error in growl.growlFinished: " + error);
    }
  }
  
  // Public methods
  return /** @scope growl */ {
    
    /**
      * @memberOf EPG.growl
      * @function init
      * @description Saves "this" and initializes the singleton.
      */
    init: function()
    {
      if(!that)
      {
        that = this;
      }
      delete that.init;
      that.checkForGrowl();
    },
    
    /**
      * @memberOf EPG.growl
      * @function checkForGrowl
      * @description Checks if growl is installed on this computer.
      * @param {function} callback Function to be run after the check has finished. Must accept a boolean as its first parameter (true if growl was installed, false if not).
      */
    checkForGrowl: function(callback) 
    {
      try
      {
        
        if(window.widget)
        {
          widget.system(pathToGrowl + " --name \"EPG\" --image \"" + pathToEPGIcon + "\" --title \"EPG\" --message \"" + Translator.translate("Jippie, you can use Growl together with the EPG widget :-)") + "\"", function(systemcall){growlCheck(systemcall, callback);});
        }
      }
      catch (error)
      {
        Debug.alert("Error in growl.checkForGrowl: " + error);
      }
    },
    
    /**
      * @memberOf EPG.growl
      * @function notifyNow
      * @description Immediately sends a growl notification message to the user.
      * @param {string} message The message to send to the user.
      * @param {string} [pathToImage] Absolute path to the image that should be used as the icon for the growl notification.
      * @param {boolean} [sticky] True if the notification should be sticky (not disappear until clicked by the user).
      */
    notifyNow: function(message, pathToImage, sticky, title) 
    {
      
      try
      {
        var message;
        // notify immediately (but if it is a reminder, perhaps check date first? If date has passed, there is no use filling the screen with messages.)
        if(window.widget)
        {
          if(userHasGrowlInstalled)
          {
            if(pathToImage)
            {
              message = pathToGrowl + " --name \"EPG\" --message \"" + message + "\" --image \"" + pathToImage + "\"";
              
            }
            else
            {
              message = pathToGrowl + " --name \"EPG\" --message \"" + message + "\" --image \"" + pathToEPGIcon + "\"";
            }
            if (title)
            {
              message += " --title \"" + title + "\"";
            }
            
            if(sticky)
            {
              message += " --sticky";
            }
            window.widget.system(message, function(systemcall){growlFinished(systemcall);});
          }
          else if(hasNotCheckedForGrowlYet)
          {
            Debug.inform("growl.notifyNow: Cannot send growl notification now, don't yet know if growl is installed. Trying again in just a moment...");
            that.notifyLater(message, pathToImage, sticky, 100, title);
          }
          else
          {
            Debug.warn("growl.notifyNow: Cannot send growl notification - growl is not installed :-(\nMessage was:\n" + message);
          }
        }
        else
        {
          //Debug.inform("GROWL NOTIFICATION:\n" + message);
        }
      }
      catch (error)
      {
        Debug.alert("Error in growl.notifyNow: " + error);
      }
    },
    
    /**
      * @memberOf EPG.growl
      * @function notifyLater
      * @description Schedules a growl notification to be displayed at a certain date and time. Will of course not show notifications if the computer is asleep or turned off.
      * @param {string} message The message to send to the user.
      * @param {string} pathToImage Absolute path to the image that should be used as the icon for the growl notification.
      * @param {boolean} sticky True if the notification should be sticky (not disappear until clicked by the user).
      * @param {object} later Date object representing at which point in time the notification should be shown to the user.
      * @param {number} msToNotification Number of milliseconds to wait before showing the notification.
      */
    notifyLater: function(message, pathToImage, sticky, later, msToNotification, title) 
    {
      try
      {
        if(!msToNotification)
        {
          msToNotification = 100;
        }
        // set a timeout that notifies at the specified date and time
        if(userHasGrowlInstalled || hasNotCheckedForGrowlYet)
        {
          timers.push(setTimeout(function(){that.notifyNow(message, pathToImage, sticky, title);}, msToNotification));
          return timers.length - 1;
        }
        else
        {
          return false;
        }
      }
      catch (error)
      {
        Debug.alert("Error in growl.notifyLater: " + error);
      }
    },
    
    /**
      * @memberOf EPG.growl
      * @function isInstalled
      * @description Returns weather growl is installed or not.
      * @return {boolean} True if growl is installed, otherwise false.
      */
    isInstalled: function() 
    {
      try
      {
        return userHasGrowlInstalled;
      }
      catch (error)
      {
        Debug.alert("Error in growl.isInstalled: " + error);
      }
    },
    
    /**
     * @memberOf EPG.growl
     * @function removeNotification
     * @description Removes a scheduled notification.
     */
    removeNotification: function (index) 
    {
      try
      {
        if(timers[index])
        {
          clearTimeout(timers[index]);
        }
      }
      catch (error)
      {
        Debug.alert("Error in EPG.growl.removeNotification: " + error);
      }
    }
    
  };
}(EPG.debug, EPG.translator);
EPG.growl.init();
//EPG.PreLoader.resume();