window.onload=function () {
	historyFn();

    $("#zysySlide").slide({ 
        mainCell:".zysy-nav ul",
        titCell:".zysy-main ul li",
        prevCell:".zysy-prev",
        nextCell:".zysy-next",
        autoPage:false,
        effect:"left",
        autoPlay:false,
        scroll:1,
        vis:3,
        easing:"swing",
        delayTime:'500',
        pnLoop:true,
        trigger:"click",
        mouseOverStop:true,
        startFun:function(i){
            $(".zysy-nav").find("li").eq(i).addClass("in").siblings("li").removeClass("in")
        }
    });

}

function historyFn() {
	if($(".history").length>0){
		var _history=$(".history").find("li"),
			_hisLen=_history.length,
			_hisL=_hisv=0,
			_hisTime,
            timeoutId;

		for(var i=0;i<_hisLen;i++){
			if(_hisv == 0){
				var _math=Math.floor(Math.random()*80);
				_history.eq(i).css({
					"top": _math+"px",
					"left": _hisL+"px"
				});
				_hisv=1;
			}else{
				var _math=Math.floor(Math.random()*(160-80)+80);
				_history.eq(i).css({
					"top": _math+"px",
					"left": _hisL+"px"
				});
				_hisv=0;
			}
			_hisL+=230;
		}

		var _item = $(".history li"),
            _itemUl = $(".history ul"),
            _itemBox = $(".history-box"),
            _len = _item.length,
            _for = _len-1,
            _prevNum = _key = 0;

        _itemUl.append('<canvas id="hisCanvas"></canvas><div class="posit"></div>');

        $(".history .posit").animate({
            top:_item.eq(_prevNum).css("top"),
            left:_item.eq(_prevNum).css("left"),
            opacity:1
        });

        if(document.getElementById("hisCanvas").getContext){
            var c = document.getElementById("hisCanvas");
            $(c).attr("width","15000");
            $(c).attr("height","230");
            for(var i=0;i<_for;i++){
                var _lt = parseFloat(_item.eq(i).css("top"))+10,
                    _ll = parseFloat(_item.eq(i).css("left"))+20,
                    _rt = parseFloat(_item.eq(i+1).css("top"))+10,
                    _rl = parseFloat(_item.eq(i+1).css("left"))+1;
                var cxt = c.getContext("2d");
                cxt.strokeStyle = 'rgba(50,179,114,1)';
                cxt.lineWidth = 1;
                cxt.beginPath();
                cxt.moveTo(_ll,_lt);
                cxt.lineTo(_rl,_rt);
                cxt.stroke();
            }
        }else{
            var _xpage = '';
            for(var i=0;i<_for;i++){
                var _lt = parseFloat(_item.eq(i).css("top"))+10,
                    _ll = parseFloat(_item.eq(i).css("left"))+10;
                _xpage = _xpage+' '+_ll+','+_lt;
            }
            _itemUl.append('<v:PolyLine strokecolor="#0b8bd4" id="PolyLine" filled="false" Points="'+_xpage+'"/>');
        }

        positHight = function(num){
            _item.removeClass("active").eq(num).addClass("active");
            if(num>2){
                _itemUl.animate({
                    left:-(num-2)*230+50
                });
            }else if(num<=2){
                _itemUl.animate({
                    left:50
                });
            }
            if(_prevNum>num){
                $(".history .posit").addClass("back");
            }else{
                $(".history .posit").removeClass("back");
            }
            if(_prevNum-num<=-2||_prevNum-num>=2){
                $(".history .posit").hide().css({
                    top:_item.eq(num).css("top"),
                    left:_item.eq(num).css("left")
                }).fadeIn();
            }else{
                $(".history .posit").animate({
                    top:_item.eq(num).css("top"),
                    left:_item.eq(num).css("left"),
                    opacity:1
                })
            }
            _prevNum = num;
        }

        _item.find("i").on("click",function(){
            var _index = $(this).parent().index();
            positHight(_index);
        });

        positHight(_prevNum);

        $(document).keydown(function(event){
            if(_key == 0){
                if(event.keyCode == 37&&_prevNum>0){
                    positHight(_prevNum-1);
                }else if(event.keyCode == 39&&_prevNum<_for){
                    positHight(_prevNum+1);
                }
            }
            _key = 1;
        });

        $(document).keyup(function(event){
            _key = 0;
        });
        _itemBox.mouseover(function(event){
            event.preventDefault();
        });
        _itemUl.bind("mousedown",function(e){
            var _long = e.pageX,
                _left = parseFloat(_itemUl.css("left"));
            _itemUl.bind("mousemove",function(e){
                document.onselectstart = function(){return false;}
                var _lend = _left-(_long-e.pageX),
                    _rend = -(_for-2)*230+50;
                if(_lend<50&&_lend>_rend){
                    _itemUl.css("left",_lend);
                }else if(_lend>50){
                    _itemUl.css("left",50);
                }else if(_lend>_rend){
                    _itemUl.css("left",_rend);
                }
            });
        });
        _itemUl.bind("mouseup",function(){
            _itemUl.unbind("mousemove");
            document.onselectstart = null;
        });
        _itemBox.mousewheel(function(event, delta) {
            clearTimeout(timeoutId);
            if(_key == 0){
                _key = 1;
                $(this).data('timeoutId', setTimeout(function() {
                    if(delta>0&&_prevNum>0){
                        positHight(_prevNum-1);
                    }else if(delta<0&&_prevNum<_for){
                        positHight(_prevNum+1);
                    }
                    _key = 0;
                }, 230));
            }
            return false;
        });

	}
}