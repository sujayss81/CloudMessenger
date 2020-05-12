var navstate = false;
$(document).ready(function(){
    $('.navbtn').click(function(){
        navstate?
            close()
        :
            open()
    })
})
var close = function(){
    $('.sidemenu').css({
        "width" : "5%"
    })
    $('.toggler').css({
        "display": "none"
    })
    $('.toggle').css({
        "display": "block"
    })
    navstate = !navstate
}
var open = function(){
    $('.sidemenu').css({
        "width" : "20%"
    });
    // $('toggler').each( function() {
    //    $(this).css({
    //     "display": "block"
    //     })
    // })
    $('.toggler').css({
        "display": "block"
    })
    $('.toggle').css({
        "display": "none"
    })
    navstate = !navstate
}