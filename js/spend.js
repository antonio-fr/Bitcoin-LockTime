// CheckLockTimeVerify spending
// Copyright (C) 2017  Antoine FERRON
//
// Spend a locktime Bitcoin account. Gets an UTXO and provides the scriptSig to move the fund.
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

$.support.cors = true;
function checkadr(account){
	console.log("Wait for payment");
	var p2shAddress = bitcore.Address.payingTo(
		bitcore.Script.empty()
			.add(bitcore.crypto.BN.fromNumber(Number($('#datelock').val())).toScriptNumBuffer())
			.add('OP_CHECKLOCKTIMEVERIFY').add('OP_DROP')
			.add(bitcore.Script.buildPublicKeyHashOut(account.privateKey.toAddress(bitcore.Networks.livenet))) , bitcore.Networks.livenet);
	document.getElementById("disp").innerHTML = 'Checking address';
	window.scrollTo(0,document.body.scrollHeight);
	$.ajax({
		//url: "https://blockexplorer.com/api/addr/"+p2shAddress.toString(),
		url: "https://api.blockcypher.com/v1/btc/main/addrs/"+p2shAddress.toString(),
		type: "GET",
		cache: false,
		dataType: "json",
		success: function (msg) {
			//if (msg.unconfirmedTxApperances + msg.txApperances > 0 ){
			if ( msg.unconfirmed_n_tx + msg.final_n_tx > 0 ){
			console.log("payment received");
				document.getElementById("disp").innerHTML = "OK, retrieving details ...";
				getfeeperkb();
				//setTimeout(GetUtxo, 60000, msg.transactions[msg.transactions.length - 1],account);
				if (msg.unconfirmed_n_tx>0)
					setTimeout(GetUtxo, 2000, msg.unconfirmed_txrefs[msg.unconfirmed_txrefs.length - 1].tx_hash,account, p2shAddress);
				else
					setTimeout(GetUtxo, 2000, msg.txrefs[msg.txrefs.length - 1].tx_hash,account, p2shAddress);
			}
			else
				setTimeout(checkadr, 60000, account);
		},
		error: function () {
			document.getElementById("disp").innerHTML = "Error";
		}
	});
}
function getfeeperkb(){
	$.getJSON( "https://api.blockcypher.com/v1/btc/main", function( json ){
		feeperkbnow = json.medium_fee_per_kb
	});
}
function GetUtxo(txid,account, p2shAddress){
	console.log("Getting utxo");
	$.ajax({
		//url: "https://blockexplorer.com/api/tx/"+txid,
		url: "https://api.blockcypher.com/v1/btc/main/txs/"+txid,
		type: "GET",
		cache: false,
		dataType: "json",
		success: function (msg) {
			var validaddr = false;
			//for (var outidx in msg.vout){
				//if (msg.vout[outidx].scriptPubKey.addresses[0]==account.address){
			for (var outidx in msg.outputs){
				if (msg.outputs[outidx].addresses[0] == p2shAddress){
					console.log(JSON.stringify(msg.outputs[outidx]));
					validaddr = true;
					document.getElementById("disp").innerHTML = "Data OK, processing ...";
					var addrdest = $('#toadr').val();
					processtx(account, msg.outputs[outidx], txid, parseInt(outidx,10) , addrdest, p2shAddress);
				}
			}
			if (!validaddr){
				setTimeout(checkadr, 60000, account);
			}
		},
		error: function () {
			document.getElementById("disp").innerHTML = "Error";
		}
	});
}

var bitcore = require('bitcore-lib');

function createaddr(pvkey){
	var privateKey = new bitcore.PrivateKey(pvkey,bitcore.Networks.livenet);
	var address = privateKey.toAddress(bitcore.Networks.livenet);
	window.scrollTo(0,document.body.scrollHeight);
	setTimeout(checkadr, 250, {'privateKey':privateKey,'address':address} )
}

function processtx(account, utxo_input, txid, outid, destaddr, p2shAddress){
	console.log("Transaction generation and signing");
	var redeemScript = bitcore.Script.empty()
		.add(bitcore.crypto.BN.fromNumber(Number($('#datelock').val())).toScriptNumBuffer())
		.add('OP_CHECKLOCKTIMEVERIFY').add('OP_DROP')
		.add(bitcore.Script.buildPublicKeyHashOut(account.address, bitcore.Networks.livenet) );
	var transaction = new bitcore.Transaction().from(
	{	"txid": txid,
		"vout": outid,
		"scriptPubKey": redeemScript.toScriptHashOut(),
		"satoshis": utxo_input.value }
	)
		.to(destaddr, utxo_input.value - Math.floor(feeperkbnow*0.25))
		.lockUntilDate(Number($('#datelock').val()), 0 );
	transaction.inputs[0].sequenceNumber = 0;
	var signature = bitcore.Transaction.sighash.sign(transaction, account.privateKey, bitcore.crypto.Signature.SIGHASH_ALL, 0, redeemScript);
	transaction.inputs[0].setScript(
		bitcore.Script.empty()
		.add(signature.toTxFormat())
		.add(account.privateKey.toPublicKey().toBuffer())
		.add(redeemScript.toBuffer()) );
	document.getElementById("disp").innerHTML = "Transaction done";
	var pushtx = { tx: transaction.toString() };
	$.post('https://api.blockcypher.com/v1/btc/main/txs/push', JSON.stringify(pushtx))
		.done(function(srvrep){
			end(srvrep.tx.hash);
		})
		.fail(function(){ document.getElementById("disp").innerHTML = "Transaction sending failed";
						  end(""); }
		);
}

function end(txid){
	if (txid.length>0){
		document.getElementById("disp").innerHTML = "Transaction Sent (won't be enforced by the network before locktime)";
		document.getElementById("tx").innerHTML = 'Tx ID : <a target="_blank" href="https://www.blocktrail.com/BTC/tx/'+txid+'">'+txid+'</a>';
	}
	var backbtn = document.createElement("BUTTON");
	var txtbut = document.createTextNode("Restart");
	backbtn.appendChild(txtbut);
	document.getElementById("tx").appendChild(backbtn);
	backbtn.setAttribute("id", "backbutton");
	window.scrollTo(0,document.body.scrollHeight);
	$('#backbutton').click( function () { window.location.href='spend.html' })
}

function GoProcess()
{ 
	var pvkeyuser = $('#pvkey').val();
	try { 
		 bitcore.PrivateKey.fromWIF(pvkeyuser);
		 bitcore.Address.fromString($('#toadr').val().toString());
		 var datenum =  Number($('#datelock').val())*1000 ;
		 new Date(datenum);
		 if ( datenum < 1000000000000 )
			throw "No Date";
		}
	catch(err){
		document.getElementById("disp").innerHTML = "Error in provided key , destination address or unix time.";
		document.getElementById("disp").style.color = "FireBrick";
		throw "Private key, address or unix time verification failed";
	}
	$('#gobut').hide();
	document.getElementById("disp").innerHTML = 'Please Wait ...';
	setTimeout(createaddr, 250, pvkeyuser)
}

$( document ).ready(function(){
	$('#gobut').click( function (){
		GoProcess()
	});
});