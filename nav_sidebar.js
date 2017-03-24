function isConstrained() {
    return $("div.mid").width() == $(window).width();
}

function resizeComponents(){

}
function applyInitialUIState() {
    if (isConstrained()) {
        $(".sidebar-left .sidebar-body").fadeOut('slide');
        $(".sidebar-right .sidebar-body").fadeOut('slide');
        $('.mini-submenu-left').fadeIn();
        $('.mini-submenu-right').fadeIn();
    }
}
$(function() {
    $('.sidebar-left .slide-submenu').on('click', function() {
        var thisEl = $(this);
        thisEl.closest('.sidebar-body').fadeOut('slide', function() {
            $('.mini-submenu-left').fadeIn();
        });
    });
    $('.mini-submenu-left').on('click', function() {
        var thisEl = $(this);
        $('.sidebar-left .sidebar-body').toggle('slide');
        thisEl.hide();
    });
    $('.sidebar-right .slide-submenu').on('click', function() {
        var thisEl = $(this);
        thisEl.closest('.sidebar-body').fadeOut('slide', function() {
            $('.mini-submenu-right').fadeIn();
        });
    });
    $('.mini-submenu-right').on('click', function() {
        var thisEl = $(this);
        $('.sidebar-right .sidebar-body').toggle('slide');
        thisEl.hide();
    });
    $(window).on("resize", resizeComponents);
    applyInitialUIState();
});