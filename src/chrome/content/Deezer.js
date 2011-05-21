/***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * Contributor(s):
 *  - Guillaume Verstraete <versgui@gmail.com>, 2011
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK *****/


if ("undefined" == typeof(VersguiDeezerControl)) {
    
    /*
     * Main methods
     */
    var VersguiDeezerControl = {
        
        _currentTrack : null,
        _trackChange : null,
        _deezerWebSite : null,
        _deezerApiGateway : null,
        _deezerApiKey : null,
        _prefs : {
            notification : true
        },
        _timers : {
            update   :     null,
            security :     null,
            notification : null,
        },
        
        init : function() {
            window.document.addEventListener('DOMContentLoaded', this.onContentDomLoad, false);
            
            this.prefInit();
            
            vdc._prefs.notification.events.addListener('change', this.onPrefChange );
        },
        
        prefInit : function() {
            
            // Notification preference
            let application = Cc['@mozilla.org/fuel/application;1'].getService(Ci.fuelIApplication);
            vdc._prefs.notification = application.prefs.get('extensions.deezercontrol.displayNotification');
        },
        
        onPrefChange : function(e) {
            
            this.prefInit();
        },
        
        onContentDomLoad : function(e) {
            
            if (!(e.originalTarget instanceof HTMLDocument && e.originalTarget.URL != 'about:blank'))
                return;
            
            if ((/\www\.deezer\.com$/. test(e.originalTarget.location.hostname) ||
                /beta\.deezer\.com$/. test(e.originalTarget.location.hostname)) &&
                e.originalTarget.getElementById('dz_player') ) {
                
                vdc._trackChange = new versguiEventTarget();
                vdc._deezerWebSite = e.originalTarget;
                
                //window.document.removeEventListener('DOMContentLoaded', vdc.onContentDomLoad, false);
                vdc._deezerWebSite.defaultView.addEventListener('unload', vdc.cleanup, false);
                
                document.getElementById('deezer-bar').addEventListener('click', vdc.setAction, false);
                document.getElementById('dc-volume-scale').addEventListener('change', vdc.setAction, false);
                
                // remove the timer (initialized on cleanup Event) if any
                clearTimeout(vdc._timers.security);
                vdc._timers.update = setInterval(function() { vdc.updateStatus() }, 200);
                
                if( parseInt(document.getElementById('deezer-bar').style.width) < 360 ||
                   document.getElementById('deezer-bar').style.width == null ||
                   document.getElementById('deezer-bar').style.width == '') {
                    
                    vdc.showBox();
                }
                
                // detect track change
                vdc._trackChange.addListener('trackChange', vdc.onChangeTrack);
            }
        },
        
        updateStatus : function() {
            
            var search_track = vdc._deezerWebSite.getElementsByClassName('info_m')[0].getElementsByClassName('title')[0];
            
            if( search_track ) {
                
                let track = search_track.textContent;
                
                if( track != vdc._currentTrack && track != '' ) {
                    
                    vdc.Tools.CSS.removeClass( document.getElementById('deezer-bar'), 'loading' );
                    
                    vdc._currentTrack = track;
                    document.getElementById('dc-statusmsg').value = track;
                    
                    vdc._trackChange.fire({ type: "trackChange" });
                }
                else if( track == '' ) {
                    vdc.Tools.CSS.addClass( document.getElementById('deezer-bar'), 'loading' );
                }
            }
            
            // play
            if( vdc._deezerWebSite.getElementById('pause') &&
                vdc._deezerWebSite.getElementById('pause').style.display == 'none' ) {
                
                document.getElementById('dc-pause').style.display = 'none';
                document.getElementById('dc-play').style.display = 'block';
            }
            else if( vdc._deezerWebSite.getElementById('pause') ) { // pause
                document.getElementById('dc-play').style.display = 'none';
                document.getElementById('dc-pause').style.display = 'block';
            }
            
            // disable controls if it's an ad
            if ( vdc._deezerWebSite.getElementById('btncontrols') &&
                    vdc._deezerWebSite.getElementById('btncontrols').style.display == 'none' ) {
                document.getElementById('dc-pause').style.opacity = 0.5;
                document.getElementById('dc-prev').style.opacity = 0.5;
                document.getElementById('dc-next').style.opacity = 0.5;
            }
            else {
                document.getElementById('dc-pause').style.opacity = 1;
                document.getElementById('dc-prev').style.opacity = 1;
                document.getElementById('dc-next').style.opacity = 1;
            }
            
            // get the current volume if different and apply to the slider
            if( vdc._deezerWebSite.getElementById('volumeslider') &&
                    vdc._deezerWebSite.getElementById('volumeslider').getElementsByTagName('a') ) {
                
                var currentVolume = parseInt( vdc._deezerWebSite.getElementById('volumeslider').getElementsByTagName('a')[0].style.left );
                
                //if( currentVolume != document.getElementById('dc-volume-scale').value )
                    //document.getElementById('dc-volume-scale').value = 100-currentVolume;
            } 
        },
        
        setAction : function(e) {
            
            // only if it's a left click except if it's a <scale> (volume)
            if( e.button == 0 || e.originalTarget.tagName == 'scale' ) {
                let d = vdc._deezerWebSite.getElementById('versgui-dc-script');
                
                if( d )
                    d.parentNode.removeChild(d);
        
                var script = vdc._deezerWebSite.createElement('script');
                script.setAttribute('type', 'application/javascript');
                script.setAttribute('id', 'versgui-dc-script');
                        
                switch( e.originalTarget.id ) {
                    case 'dc-play':
                        script.textContent = 'playercontrol.doAction(\'play\')';
                    break;
                    case 'dc-pause':
                        script.textContent = 'playercontrol.doAction(\'pause\')';
                    break;
                    case 'dc-next':
                        script.textContent = 'playercontrol.doAction(\'next\')';
                    break;
                    case 'dc-prev':
                        script.textContent = 'playercontrol.doAction(\'prev\')';
                    break;
                    case 'dc-volume-scale':
                        var sliderValue = parseInt(10-e.originalTarget.value/10)/10;
                    
                        if( sliderValue == 0 )
                            document.getElementById('dc-volume').setAttribute('class', 'dc-volume-off icon');
                        else
                            document.getElementById('dc-volume').setAttribute('class', 'dc-volume icon');
                        
                        //script.textContent = 'dzPlayer.setVolume('+ sliderValue +')';//alert('dzPlayer.setVolume('+ sliderValue +')');
                        script.textContent = 'playercontrol.doAction(\'volume\', ['+ sliderValue +'])';
                        
                        //vdc._deezerWebSite.getElementById('volumeslider').getElementsByTagName('a')[0].style.left = sliderValue*50 +'px';
                        vdc._deezerWebSite.getElementById('volumeslider').slider({
                            value: e.originalTarget.value
                        });
                    break;
                }
                    
                vdc._deezerWebSite.body.appendChild(script);
                    
                vdc.updateStatus();
            }
        },
        
        onChangeTrack : function(e) {
            
            if( vdc._deezerWebSite.getElementById('play').style.display == 'none' ) {
                vdc.displayNotification('DeezerControl', vdc._currentTrack);
            }
        },
        
        cleanup : function() {
            
            clearInterval(vdc._timers.update);
            
            document.getElementById('dc-statusmsg').value = '';
            document.getElementById('dc-pause').style.display = 'none';
            document.getElementById('dc-play').style.display = 'block';
            
            vdc._currentTrack = null;
            
            // a timer to check if the website has been closed, or if it's a fake event (firefox bug) - 10sec
            vdc._timers.security = setTimeout(function() { vdc.hideBox() }, 6500);
        },
        
        showBox : function()	{
                
            let t = new Tween(document.getElementById('deezer-bar').style, 'width', Tween.regularEaseOut, 0, 360, 2, 'px');
            t.start();
        },
        
        hideBox : function()	{
                
            let t = new Tween(document.getElementById('deezer-bar').style, 'width', Tween.regularEaseOut, 360, 0, 2, 'px');
            t.start();
            
            document.getElementById('deezer-bar').removeEventListener('click', vdc.setAction, false);
            document.getElementById('dc-volume-scale').removeEventListener('change', vdc.setAction, false);
            vdc._deezerWebSite.defaultView.removeEventListener('unload', vdc.cleanup, false);
            
            vdc._trackChange.removeListener('trackChange', vdc.onChangeTrack);
            
            vdc._prefs.notification.events.removeListener('change', this.onPrefChange );
        },
        
        displayNotification : function(title, message) {
            
            clearTimeout(vdc._timers.notification);
            
            let that = this;
            this.notifTitle = title;
            this.notifMsg   = message;
            
            vdc._timers.notification = setTimeout(function() {
                
                if( vdc._prefs.notification.value == true ) {
                    let alertsService = Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService);
            
                    alertsService.showAlertNotification(
                        "",
                        that.notifTitle, that.notifMsg, false, "", that,
                        "DeezerControl");
                }
                
            }, 2000);
        }
    };
    
    VersguiDeezerControl.BrowserOverlay = {
        
        showPrefWindow : function(e) {
            
            if (null == this._preferencesWindow || this._preferencesWindow.closed) {
            let instantApply = Application.prefs.get("browser.preferences.instantApply");
            let features = "chrome,titlebar,toolbar,centerscreen" +
                                (instantApply.value ? ",dialog=no" : ",modal");
        
            this._preferencesWindow = window.openDialog(
                        "chrome://deezercont/content/prefs.xul",
                        "dc-preferences-window", features);
          }
        
          this._preferencesWindow.focus();
        },
        
        setSearchFocus : function(e) {
            //alert('yep');
            document.getElementById('dc-search-popup-tb').focus();
        }
    };
        
    var vdc = VersguiDeezerControl;
    
    /**
    * Constructor.
    */
    (function() {        
        this.init();
    }).apply(VersguiDeezerControl);
}