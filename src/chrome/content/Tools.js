VersguiDeezerControl.Tools = {


};

VersguiDeezerControl.Tools.CSS = {
        
    /* From http://www.openjs.com/scripts/dom/class_manipulation.php */
    
    hasClass : function(ele, cls) {
        return ele.className.match( new RegExp('(\\s|^)'+ cls +'(\\s|$)') );
    },
    
    addClass : function(ele, cls) {
        if (!this.hasClass(ele,cls)) ele.className += " "+ cls;
    },

    removeClass : function(ele, cls) {
        if ( VersguiDeezerControl.Tools.CSS.hasClass(ele,cls) ) {
            var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
            ele.className = ele.className.replace(reg, ' ');
        }
    }
}