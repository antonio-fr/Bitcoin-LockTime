// CheckLockTimeVerify Address generator
// Copyright (C) 2017  Antoine FERRON
//
// Fund a locktime Bitcoin account, an address from pay-to-script-hash
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 3 of the License.
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>

var bitcore = require('bitcore-lib');

function dispback(){
	var backbtn = document.createElement("BUTTON");
	var txtbut = document.createTextNode("Restart");
	backbtn.appendChild(txtbut);
	document.getElementById("back").appendChild(backbtn);
	backbtn.setAttribute("id", "backbutton");
	window.scrollTo(0,document.body.scrollHeight);
	$('#backbutton').click( function () { window.location.href='fund.html' })
}
function genaddr(){
	var qrcode = new QRCode("qrcode", {width: 160,height: 160, correctLevel : QRCode.CorrectLevel.M});
	window.scrollTo(0,document.body.scrollHeight);
	if ($('#newadr')[0].checked){
		var privateKey = new bitcore.PrivateKey(null,bnetwork);
		var pubadr = privateKey.toAddress(bnetwork);
		var pvkeydisp = privateKey.toWIF();
	}
	else{
		var pubadr = $('#userpubadr').val().toString();
		var pvkeydisp = "the one related to the public address filled in";
	}
	var p2shAddress = bitcore.Address.payingTo(
	bitcore.Script.empty()
		.add(bitcore.crypto.BN.fromNumber( Math.floor( $("#datepicker").datepicker("getDate") / 1000 ) ).toScriptNumBuffer())
		.add('OP_CHECKLOCKTIMEVERIFY').add('OP_DROP')
		.add(bitcore.Script.buildPublicKeyHashOut( pubadr )) , bnetwork);
	$('#qrcode').show();
	qrcode.makeCode("bitcoin:"+p2shAddress);
	document.getElementById("disp").innerHTML = 'Locked Time address <a href="bitcoin:'+p2shAddress+'">'+p2shAddress+'</a>';
	document.getElementById("back").innerHTML = 'Check Address <a target="_blank" href="'+blockurl+p2shAddress+'">on Block explorer</a>';
	document.getElementById("disp").innerHTML += "<br>PV KEY : "+pvkeydisp;
	document.getElementById("disp").innerHTML += "<br>LockTime : "+Math.floor( $("#datepicker").datepicker("getDate") / 1000 );
	dispback();
	window.scrollTo(0,document.body.scrollHeight)
}
function GoProcess(msg)
{
	$('#gobut').hide();
	testnet = $('#testsel')[0].checked;
	if (testnet){
		bnetwork = bitcore.Networks.testnet;
		blockurl = "https://www.blocktrail.com/tBTC/address/";
	}
	else{
		bnetwork = bitcore.Networks.livenet;
		blockurl = "https://www.blocktrail.com/BTC/address/";
	}
	try { 
		 if (!$('#newadr')[0].checked)
			bitcore.Address.fromString($('#userpubadr').val().toString());
		 new Date( $("#datepicker").datepicker("getDate") )
		 if ($("#datepicker").datepicker("getDate") == null)
			throw "No Date";
	}
	catch(err){
		document.getElementById("disp").innerHTML = "Error in Address or Date";
		document.getElementById("disp").style.color = "FireBrick";
		dispback();
		throw "Address and Date verification failed";
	}
	document.getElementById("disp").innerHTML = 'Please Wait';
	setTimeout(genaddr, 250)
}
$( document ).ready(function() { 
	$('#qrcode').hide();
	$('#newadr')[0].checked = false;
	$('#gobut').click( function () {
		GoProcess();
	});
	$( "#datepicker" ).datepicker({minDate:0});
	$('#newadr')[0].onchange = function () {
		if ($('#newadr')[0].checked) $('#addrfield').hide();
		else $('#addrfield').show()
	};
});