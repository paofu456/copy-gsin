$(function(){
	//内页菜单
	if($(".sec-submenu").length>0){
		var len=$(".sec-submenu").find("a").length;
		$(".sec-submenu a").each(function(a,b){
			$(this).css("width",(1200/len)+"px");
		})
	}
	//preloader
    $(window).load(function(){
        $("#preloader").fadeOut("slow")
    });
    //客服
    $(".gr_kefu .kf3").hover(function(){
        $(this).find(".sidebox").stop().animate({"width":"130px"},160);
        $(this).find(".sidebox3").stop().animate({"width":"200px"},160);
    },function(){
        $(this).find(".sidebox").stop().animate({"width":"50px"},160);
    });
    $('.gr_kefu .kf2').hover(function() {
        $(this).find('.kf_wx').fadeIn();
    }, function() {
        $(this).find('.kf_wx').fadeOut();
	});
	$(".kf-shqi").on("click",function(){
		$('.gr_kefu').toggleClass("show");
		if($('.gr_kefu').hasClass("show")){
			$('.gr_kefu').find("ul").fadeIn()
		}else{
			$('.gr_kefu').find("ul").fadeOut()
		}
	});
	$(".kf-gotop").on("click",function(){
		$('html,body').animate({'scrollTop':0},600);
	});

})
