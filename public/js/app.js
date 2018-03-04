// 	<input type="button" value="showForm" onclick="showForm('hcm')"/><br /><br />
//	<div id="debug"></div>
var lang = {};

function changeLang(lg)
{
	if(lg!=1)lg=0;

	$("span").each(function(){
		var $this = $(this);
		var ix = $this.data("lg"); //		trace(ix);
		if(lang[ix]) $(this).text(lang[ix][lg]);
	});

	$("select").each(function(){
		var $this = $(this);
		var ix = $this.data("lg"); //		trace(ix);
		var i = 0;
		$this.find("option").each(function(){
			if(lang[ix]) $(this).text(lang[ix][lg][i++]);
		})
	});
}

function showForm(name) 
{//trace("show: "+name);
	var r = open(name); 
	var obj = JSON.parse(r); //trace(Object.keys(obj));
	setForm(name,obj);
changeLang(0);
}

/////////
function trace(s)
{
	var d = document.getElementById("debug");
	s = JSON.stringify(s);
	d.innerHTML += s + "<br />";
}

function sendForm(name) 
{
	var s = getForm(name);
	save(name,s); //trace("send: "+name);
	$.ajax({url: "/api/v1/form/1/set/?d="+s, success: function(result){
        trace(result);
    }});
}

function getForm(name)
{
	var fields;
	try{
		fields = $( "#" + name ).serializeArray(); 
	}catch(e){trace(e);}
	var obj = {};
	for(var i=0;i<fields.length;i++) obj[fields[i].name] = fields[i].value;
	var r = JSON.stringify(obj); 
	return r;	
}
function open(name)
{
	var r = null;
	try{
		r = localStorage.getItem(name);
	}catch(e){}
	return r;	
}
function save(name, content)
{
	//sessionStorage
	localStorage.setItem(name, content); 
}

function setForm(name, data)
{//trace(data["f0"]);
	var el,val;
	var form = document.getElementById(name);
	for(var i=0; i < form.elements.length; i++){
	    el = form.elements[i];
	    val = data[el.name];
	    if (val == null) continue;
//	    trace(el.name+"="+el.value +" : "+el.type);
//	    trace(el.name+"="+data[el.name] + ":"+el.type);
	    switch(el.type){
	        case 'checkbox':
	            el.checked = true;
	            break;
	        case 'radio':
	            if (el.value == val)el.checked = true;
	            break;
	        default:
	            el.value = val;
	    }
	}	
}
