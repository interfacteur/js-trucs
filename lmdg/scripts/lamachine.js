/*
Projet :	Dolce Gusto, La Machine
Date :		08 X 2012
Auteur :	gaelan
								*/


/* parametrages Facebook et localStorage : cf. phase.js */


/*
DONNEES PARAMETRABLES								*/

//Titre de page
var titre = "Dolce Gusto - La Machine";

//Menu
var indications = new Array();
indications[0] = ["Vous \xEAtes sur la page d'accueil de la Machine"];
indications[1] = ["Vous \xEAtes sur la page principale de l'\xE9v\xE9nement"];
indications[2] = ["Vous \xEAtes sur la page principale l'exposition"];
indications[3] = ["Vous \xEAtes sur la page principale des ateliers"];
indications[4] = ["Vous \xEAtes sur la page de l'openbar"];
indications[-100] = null; //par securite (?)
var navigation = {
	accueil : 0,
	evenement : 1,
	exposition : 2,
	ateliers : 3,
	openbar : 4
};

//Formulaire
var confirmation = new Array();
var agenda = "\x3E Les ateliers";
confirmation[0] = "Votre inscription a bien \xE9t\xE9 prise en compte.<br />Vous allez recevoir un mail de confirmation.";
confirmation[1] = "Veuillez v\xE9rifier que vous avez saisi correctement<br />tous les champs obligatoires";
confirmation[2] = "L'atelier est d\xE9sormais complet :<br />nous regrettons de ne pouvoir vous y inscrire.";
confirmation[3] = "Un utilisateur identique est d\xE9j\xE0 inscrit \xE0 cet atelier :<br />nous regrettons de ne pouvoir vous y inscrire.";

//Superbox
var closeTxt = "Fermer la vue"; // Texte du bouton "Close"
var prevTxt = "Image pr\xE9c\xE9dente"; // Texte du bouton "previous"
var nextTxt = "Image suivante"; // Texte du bouton "Next"
var boxWidth = 780; // Largeur par défaut de la box
var boxHeight = 578; // Hauteur par défaut de la box

//Video
var player = racine + "videos/video-js.swf"
var videos = new Array();
videos[0] = racine + "videos/nescafe-dolce-gusto.mp4";
videos[1] = racine + "videos/MO_alexandra_bruel.mp4";
videos[2] = racine + "videos/ITW_Alexandra-Bruel.mp4";
videos[3] = racine + "videos/ITW_Camille-Lebourges.mp4";
videos[4] = racine + "videos/ITW_Cosmo-Sapiens.mp4";
videos[5] = racine + "videos/ITW_Dai-Dai-Tran.mp4";
videos[6] = racine + "videos/ITW_Haribow.mp4";
videos[7] = racine + "videos/ITW_Karine-Virly.mp4";
videos[8] = racine + "videos/ITW_Tizieu.mp4";

//Animations de transition cf. http://gsgd.co.uk/sandbox/jquery/easing/jquery.easing.1.3.js
var duree = 1500;
var dureePartielle = duree *.5;
var dureeDiapo = 1230;
var resolution = 1080; //hauteur pour adaptation aux ecrans

jQuery.extend(jQuery.easing,{
	easeInOutCubic: function (x, t, b, c, d){
		if ((t/=d/2) < 1) return c/2*t*t*t + b;
		return c/2*((t-=2)*t*t + 2) + b;
	},
	easeOutExpo: function (x, t, b, c, d){
		return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
}	});
var animations = ["easeOutExpo","easeInOutCubic","easeInOutCubic"];

//Association index et identifiant dans flux JSON via ateliersID :
	//l'index correspond a identifiant JSON - 1
	//la valeur correspond a l'une des 12 cases de l'agenda en comptant a partir de 0
// var ateliersId = [3,1,2,9,9,0,0,5,5,7,7,4,4,8,8,6]; //avt up 121207
var ateliersId = [3,1,2,11,11,0,0,5,5,7,7,4,4,8,8,6,9,9,10,10];
var agencement = 12; //nombre de cases a l'agenda



/* Sommaire :
   )- DIVERS
1.0)- METTRE EN PLACE LA NAVIGATION PAR TRANSITION DE CONTENU
1.1)- GERER LES TRANSITIONS PARTIELLES
2.0)- AGIR DANS LES CONTENUS AU CHARGEMENT OU APRES TRANSITION
2.1)- WS
2.2)- API
3.0)- ROUTINE AJAX								*/





/* detection des API HTML 5 */
var memorisation = typeof localStorage == "undefined" ? false : true;
var adressage = history.pushState && history.replaceState ? true : false;


var ateliers = false; //a la premiere requete ws puis donnees memorises
var machines = false; //a la premiere requete ws puis donnees memorisees


(function($){

	//Classer un element (contenu)
	$.fn.situer = function(zn){
		var classes = $(this).attr("class").split(" ");
		if (zn == 1) classes.shift(); //NB : enlever la classe "contenu" (a priori ordre des classes respecte sur du xml)
		this.theme = classes[0];
		this.niveau = classes[1];
		this.classes = classes.join(" ");
	}

	//Classer une requete
	String.prototype.situer = function(){ //pour href cad ne finissant par par slash
		if (this.indexOf("accueil") > -1) return ["niveau1","accueil"];
		else{
			var coupes = this.split(racine).pop().split("-"); //coupes[0] : theme
			if (coupes[1].indexOf("index") == 0) return ["niveau2",coupes[0],coupes[1]];
			else if (coupes.length == 3) return ["niveau4",coupes[0],coupes[1]]; //a priori 'theme' sera toujours 'ateliers' en ce cas
			else return ["niveau3",coupes[0],coupes[1]];
	}	}

	$("document").ready(function(){

		if ($.browser.mozilla) route.addClass("moz");
		if ($.browser.msie){
			if ($.browser.version == 7) route.addClass("msie7");
			else if ($.browser.version == 8) route.addClass("msie8");
			else if ($.browser.version == 8) $("body *").css("filter","inherit"); //http://stackoverflow.com/questions/7664107/jquery-animating-opacity-in-ie8
				//apparemment fonctionne de facon dynamique : sur du code non encore inejcte - accueil OK en tout cas
		}




/*
1.0)- METTRE EN PLACE LA NAVIGATION								*/

		//Rattacher au contenu des informations de navigation
		var ancrage = location.hash.substring(1);
		var service = location.pathname.split("/").pop();
		if (service.length == 0) $(".contenu").data({ adresse : "accueil", affichage : "" });
		else if (service.split("-")[1] == "index") $(".contenu").data({ adresse : service, affichage : service.split("-")[0] });
		else $(".contenu").data({ adresse : service, affichage : service });

		//Variables globales
		var corps = $("body");
		var menu = $("#menu");
		var contenu = $("#contenu");
		var footer = $("#footer");
		var cible;
		var ciblage;
		var relais;
		var requetes;
		var requeste;
		var raquettes;
		var dureeReglage = duree;
		var transition = false;
		var transitionPartielle = [false,false];
		var pages = new Array();
		var donnees = new Array();
		var sommaire = false;
		var retours = [false,false];

		//Ajuster la position des contenus en fonction de la largeur et de la hauteur de la fenetre
		corps.centrer = function(){
			var largeur = corps.width();
			var large = contenu.width();
			if (largeur > large) contenu.add($(".menu")).add($(".footer")).css({ marginLeft : (largeur - large) / 2 });
			else menu.css({ position : "absolute"});
		}	
		corps.centrer();
		onresize = function(){
			corps.centrer();
		}
		footer.css({ top: $(".contenu").last().height() + 12 + "px" });
		var ecran = screen.height;
		if (ecran <  resolution){ //redimensionnements
			var echelle = ecran < 550 ? .5 : ecran /  resolution;
			if ($.browser.mozilla) corps.css("-moz-transform","scale(" + echelle + ")");
			else if ($.browser.webkit) corps.css("-webkit-transform","scale(" + echelle + ")");
			else if ($.browser.opera) corps.css("-o-transform","scale(" + echelle + ")");
			else if (! $.browser.msie) corps.css("transform","scale(" + echelle + ")"); //msie tp imprevisible, meme ie9, meme les filter pour < 9

/*
si IE 7 : corps.css("filter","progid:DXImageTransform.Microsoft.Matrix(M11=" + echelle + ", M12=0, M21=0, M22=" + echelle + ", SizingMethod='auto expand')");
si IE 9 : corps.css("transform","scale(" + echelle + ")"); ?
 pour tests filter etc. voir brouillons environ 12 nov.
 */
			if (corps.css("transform") != "none"){
				var marg = ((corps.width() / echelle) - corps.width()) / 2;
				menu.css({ paddingLeft : marg, paddingRight : marg, marginLeft : -marg });
		}	}

		//Desactiver le lien de la page active dans le menu (pas de lien recursif)
		menu.rubriques = menu.find("a:lt(6)");
		menu.principales = menu.find("a:lt(5)");
		var principales = [menu.principales.length,0];
		menu.rubriques.each(function(){
			$(this).data("cible",$(this).attr("href"));
		});
		menu.mener = function(){
			corps.situer();
			var actif = corps.niveau == "niveau1" || corps.niveau == "niveau2" ? navigation[corps.theme] : -100;
			menu.rubriques.eq(actif).removeAttr("href").attr("title",indications[actif]);
			if (actif == 3) menu.rubriques.eq(5).removeAttr("href");
		}
		menu.demeurer = function(){
			menu.rubriques.each(function(zi){
				$(this).attr("href",$(this).data("cible")).removeAttr("title");
		});	}
		menu.mener();

		//Pouvoir memoriser le code des contenus : <div class="contenu etc"
		function memoriser(identite,zcontenu){
			if ($("<div>",{ "html" : zcontenu}).find(":first-child").hasClass("contenu")) emmagasiner(identite,zcontenu);
		}

//API HTML5 (multissession sur un client donne)
		if (memorisation){ //vidange : cf. phase.js
			var emmagasiner = function(identite,zcontenu){
				try{
					localStorage.setItem(identite,zcontenu);
					pages[identite] = zcontenu;
				} catch(e){
					localStorage.clear();
					for (page in pages) localStorage.setItem(page,pages[page]); //non teste
		}	}	}
//HTML 4 (une seule consultation sans rechargement)
		else{
			var emmagasiner = function(identite,zcontenu){
				pages[identite] = zcontenu;
		}	}

		//Memoriser la page actuelle - quel que soit son statut dans la memoire des pages
		memoriser($(".contenu").last().data().adresse,contenu.html());

		//Jalonner les transitions
		function querir(zn){
			var etapes = Math.abs(zn);
			requeste = etapes; //pour savoir si la fermeture du niveau 4 retrograde d'1 ou 2 contenus
			requetes = new Array(etapes);
			relais = new Array();
			if (zn == -2) relais[0] = [ciblage[1] + "-index",ciblage[1]];
			else if (zn == 2) relais[0] = [ciblage[1] + "-" + ciblage[2],ciblage[1] + "-" + ciblage[2]];
			var destination = cible.split("/").pop(); //cible.substring(cible.lastIndexOf("/") + 1)
			if (destination == "accueil") relais.push(["accueil",""]);
			else{
				if (destination.lastIndexOf("index") == destination.length - 5) relais.push([destination,destination.split("-")[0]]);
				else relais.push([destination,destination]);
		}	}

		//Traiter la reponse a la requete ajax en la memorisant (sans suite de transition) 
		window.percevoir = function(zajax,zparam){
			var code = $(zajax.responseXML.documentElement);
			var gnap = false;
			try{ gnap = typeof code.html(); } //IE7 IE8
			catch(e){ gnap = "ie9"; } //m puissance 1000
			if (gnap == "undefined" || gnap == "ie9") code = $("<div>",{ "html" : zajax.responseText }).find("div"); //IE
			memoriser(zparam.split("ı")[0],code.html());
			principales[1] ++;
			if (principales[0] == principales[1]) corps.removeClass("installation");
		}

		//Traiter la reponse a la requete ajax en la memorisant et avec suite d'articulation entre contenus
		window.recevoir = function(zajax,zparam){
			var parametres = zparam.split("ı"); //un peu uzigaz la transmission des parametres avec appeler()
		 	var adresse = parametres[0];
			var parametre = parametres[1];
			requetes[parametre] = $(zajax.responseXML.documentElement); //FF et webkit curieusmenent marchent aussi avec $(zajax.responseXML).html()
			var gnap = false;
			try{ gnap = typeof requetes[parametre].html(); } //IE7 IE8
			catch(e){ gnap = "ie9"; } //m puissance 1000
			if (gnap == "undefined" || gnap == "ie9") requetes[parametre] = $("<div>",{ "html" : zajax.responseText }).find("div"); //IE
			corps.removeClass("attente");
			memoriser(relais[parametre][0],requetes[parametre].html());
			for (var i = 0;i<requetes.length;i++) if (typeof requetes[i] === "undefined") return; //mutlirequete possible
			if (parametres.length == 3) retrograder(adresse,parametres[2]);
			else{
				introduire(adresse,requetes[0]);
				requetes.shift();
		}	}

		//Traiter la reponse a la requete ajax de contenus internmediaires au chargement d'une page de niveaux 3 ou 4
		window.etayer = function(zajax,zparam){
			var parametres = zparam.split("ı"); //un peu uzigaz la transmission des parametres avec appeler()
			var ciblable = parametres[0];
			var laquelle = parametres[1];
			raquettes[laquelle] = [$(zajax.responseXML.documentElement),ciblable]; //FF et webkit curieusmenent marchent aussi avec $(zajax.responseXML).html()
			var gnap = false;
			try{ gnap = typeof raquettes[parametre].html(); } //IE7 IE8
			catch(e){ gnap = "ie9"; } //m puissance 1000
			if (gnap == "undefined" || gnap == "ie9") raquettes[laquelle] = [$("<div>",{ "html" : zajax.responseText }).find("div"),ciblable]; //IE
			corps.removeClass("attente");
			memoriser(ciblable,raquettes[laquelle][0].html());
			produire();
		}

		//Inserer les contenus intermediaires, soit directement a partir du locasStorage, sans en etant passe par etayer()
		function produire(){
			for (var i = 0;i<raquettes.length;i++) if (typeof raquettes[i] === "undefined") return; //mutlirequete possible
			for (var i = 0;i<raquettes.length;i++){
				raquettes[i][0].find(".contenu").css({ left : - 1180 * (i + 1), opacity : 0});
				contenu.prepend(raquettes[i][0].html());
				var etais = $(".contenu");
				etais.eq(0).animate({ opacity : 1}, duree / 2,"linear");
				etais.eq(0).css({ height : etais.eq(0).height() }); //attention aux boutons d'inscription qui disparaissent
				etais.eq(1).css({ marginTop : - etais.eq(0).height() });
				var affichage = raquettes[i][1].indexOf("index") > 0 ? raquettes[i][1].split("-")[0] : raquettes[i][1]; //contenus intermediaires : vrais index
				etais.eq(0).data({ adresse : raquettes[i][1], affichage : affichage });raquettes[i][1];
			}
			footer.css({ top : etais.last().height() + 12});
			decompenser();
		}

		//Ne pas bloquer les transition si un probleme dans etayer()
		window.decompenser = function(){
			corps.removeClass("attente"); //pour le ca ou decompenser appele par erreur ajax
			if (transition != true) $("a[href]:not(.immediat):eq(0)").trigger({ type : "click", cible : transition });
			else transition = false;
		}

		//Verifier l'existence d'un include apres analyse de l'ancre - cf. if (ancrage) - avant de l'aller querir
		window.accepter = function(zajax,zparam){
			var code = $(zajax.responseXML.documentElement);
			var gnap = false;
			try{ gnap = typeof code.html(); } //IE7 IE8
			catch(e){ gnap = "ie9"; } //m puissance 1000
			if (gnap == "undefined" || gnap == "ie9") code = $("<div>",{ "html" : zajax.responseText }).find("div"); //IE
			var ancre = zparam.split("ı")[0];
			memoriser(ancre,code.html());
			setTimeout(function(){
				/* if (adressage) */ $("a[href]:not(.immediat):eq(0)").trigger({ type : "click", cible : ancre }); //cr. re-ecriture ancre dans if (ancrage)
				//else return; //$("a[href]:not(.externe):eq(0)").trigger({ type : "click", cible : ancre, autotour : true });
			},500);
		}
		window.refuser = function(){
			location.hash = "";
		}
		//Recuperer le contenu a injecter qui est memorise
		function recuperer(stock,adresse,rang,retro){
			requetes[rang] = $("<div>",{ "html" : stock });
			for (var i = 0;i<requetes.length;i++) if (typeof requetes[i] === "undefined") return; //mutlirequete possible
			if (retro) retrograder(adresse,retro);
			else{
				introduire(adresse,requetes[0]);
				requetes.shift();
		}	}

		//Obtention des articulations entre les contenus selon leur niveeau dans l'arborescence
		var transitions = new Array(); //nb : appele au click puis rappele dans introduire()
		for (var i = 1;i<5;i++) transitions["niveau" + i] = new Array();
		transitions["niveau1"]["niveau2"] = function(){ return "verticale"; } 
		transitions["niveau2"]["niveau1"] = function(){ return "verticale"; }
		transitions["niveau2"]["niveau2"] = function(th0,th1){
			if (th0 != th1) return "verticale"; //pas de lien recursif mais arguments pour verification (history.state...)
		}
		transitions["niveau2"]["niveau3"] = function(th0,th1){ 
			if (th0 == th1) return "horizontale droite";
			else return "verticale horizontale droite";
				//PS : sans doute exclusion de fait PUISQUE il ne resterait plus de niveau 3 accessible d'ailleurs que depuis l'accueil ou son niveau 2
		}
		transitions["niveau3"]["niveau2"] = function(th0,th1){ 
			if (th0 == th1) return "horizontale gauche";
			else return "horizontale gauche verticale";
		}
		transitions["niveau1"]["niveau3"] = function(){ return "verticale horizontale droite"; }
		transitions["niveau3"]["niveau1"] = function(){ return "horizontale gauche verticale"; }
		transitions["niveau3"]["niveau3"] = function(th0,th1){
			if (th0 == th1) return "horizontale gauche horizontale droite"; //attention : niveau 3 de evenement
			else return "horizontale gauche verticale horizontale droite"; //faut-il exclure ce type de transistion entre deux niveaux 3 de theme distinct ?
			//PS : sans doute exclusion de fait PUISQUE il ne resterait plus de niveau 3 accessible d'ailleurs que depuis l'accueil ou son niveau 2
		} 
		transitions["niveau2"]["niveau4"] = function(){ return "horizontale droite horizontale droite"; }
		transitions["niveau3"]["niveau4"] = function(){ return "horizontale droite"; }
		transitions["niveau4"]["niveau1"] = function(){ return "horizontale gauche horizontale gauche verticale"; }
		transitions["niveau4"]["niveau2"] = function(th0,th1){
			if (th0 == th1) return "horizontale gauche horizontale gauche";
			else return "horizontale gauche horizontale gauche verticale";
		}
		transitions["niveau4"]["niveau3"] = function(){ return "horizontale gauche"; }

		//Definir les animations en fonction des articulations entre contenus
		//NB : l'execution par des Array est plus rapide que la sollicitation de proprietes (transitions) et de methodes (transiter)
		var transiter = new Array();
		//Verticalement
		transiter["verticale"] = function(adresse,cible){
			ease = 0;
			querir(1);
			if (pages[relais[0][0]]) recuperer(pages[relais[0][0]],adresse,0);
			else appeler(enracine + relais[0][0] + ".php",0,recevoir,-2,false,function(){ document.location.href = racine + relais[0][0]; },false,false,adresse,0);
		}
		//Horizontalement vers la droite
		transiter["horizontale droite"] = function(adresse,cible){
			ease = 0;
			querir(1);
			if (pages[relais[0][0]]) recuperer(pages[relais[0][0]],adresse,0);
			else appeler(enracine + relais[0][0] + ".php",0,recevoir,-2,false,function(){ document.location.href = racine + relais[0][0]; },false,false,adresse,0);
		}
		transiter["horizontale droite horizontale droite"] = function(adresse,cible){ //a priori pour inscription aux ateliers uniquement
			ease = 1;
			querir(2);
			if (pages[relais[0][0]]) recuperer(pages[relais[0][0]],adresse,0);
			else appeler(enracine + relais[0][0] + ".php",0,recevoir,-2,false,function(){ document.location.href = racine + relais[0][0]; },false,false,adresse,0);
			if (pages[relais[1][0]]) recuperer(pages[relais[1][0]],adresse,1);
			else appeler(enracine + relais[1][0] + ".php",0,recevoir,-2,false,function(){ document.location.href = racine + relais[1][0]; },false,false,adresse,1);
		}
		transiter["verticale horizontale droite"] = function(adresse,cible){
			ease = 1;
			querir(-2);
			if (pages[relais[0][0]]) recuperer(pages[relais[0][0]],adresse,0);
			else appeler(enracine + relais[0][0] + ".php",0,recevoir,-2,false,function(){ document.location.href = racine + relais[0][0]; },false,false,adresse,0);
			if (pages[relais[1][0]]) recuperer(pages[relais[1][0]],adresse,1);
			else appeler(enracine + relais[1][0] + ".php",0,recevoir,-2,false,function(){ document.location.href = racine + relais[1][0]; },false,false,adresse,1);
		}
		//Horizontalement vers la gauche
		transiter["horizontale gauche"] = function(adresse){
			ease = 0;
			retrograder(adresse,0);
		}
		transiter["horizontale gauche horizontale gauche"] = function(adresse){
			ease = 1;
			retrograder(adresse,2);
		}
		transiter["horizontale gauche verticale"] = function(adresse,cible){
			ease = 1;
			querir(1);
			if (pages[relais[0][0]]) recuperer(pages[relais[0][0]],adresse,0,-1);
			else appeler(enracine + relais[0][0] + ".php",0,recevoir,-2,false,function(){ document.location.href = racine + relais[0][0]; },false,false,adresse,0,-1);
		}
		transiter["horizontale gauche horizontale gauche verticale"] = function(adresse,cible){
			ease = 2;
			querir(1);
			if (pages[relais[0][0]]) recuperer(pages[relais[0][0]],adresse,0,-2);
			else appeler(enracine + relais[0][0] + ".php",0,recevoir,-2,false,function(adresse,cible){ document.location.href = racine + relais[0][0]; },false,false,adresse,0,-2);
		}
		//Horizontalement vers la gauche puis verticalement vers la droite
		transiter["horizontale gauche horizontale droite"] = function(adresse,cible){
			ease = 1;
			querir(1);
			if (pages[relais[0][0]]) recuperer(pages[relais[0][0]],adresse,0,-1);
			else appeler(enracine + relais[0][0] + ".php",0,recevoir,-2,false,function(){ document.location.href = racine + relais[0][0]; },false,false,adresse,0,-1);
		}
		//Double articulation probablement perimee
		transiter["horizontale gauche verticale horizontale droite"] = function(adresse,cible){
			ease = 2;
			querir(-2);
			if (pages[relais[0][0]]) recuperer(pages[relais[0][0]],adresse,0,-1);
			else appeler(enracine + relais[0][0] + ".php",0,recevoir,-2,false,function(){ document.location.href = racine + relais[0][0]; },false,false,adresse,0,-1);
			if (pages[relais[1][0]]) recuperer(pages[relais[1][0]],adresse,1,-1);
			else appeler(enracine + relais[1][0] + ".php",0,recevoir,-2,false,function(){ document.location.href = racine + relais[1][0]; },false,false,adresse,1,-1);
		}

		//Gerer le clic sur un lien (interne)
		$("a[href]:not(.immediat)").live("click",function(ze){
			ze.preventDefault();
			cible = ze.isTrigger ? ze.cible : $(this).attr("href").split("/").pop(); //transmission de l'equivalent de la valeur du href : comme objet direct de l'evenement (via variable transition)
			if ($(".attente").length > 0) var actuel = $(".attente").data().adresse;
			else var actuel = $(".contenu").last().data().adresse;
			if (cible == actuel) return; //Possibilite d'appel redondant notamment avec les fleches du clavier pour naviguer dans l'historique (alt + fleche)
			dureeReglage = duree;
			var adresse = 1;
			if (ze.isTrigger){ //clics simules : le dernier de clics consecutifs, navigation par l'historique
				if (ze.autotour){
					adresse = 0; //ne pas re-ecrire l'adresse quand navigation par l'historique
					dureeReglage = 1;
				} else dureeReglage = duree / 2; //acceleration pour des clics consecutifs		
			}
			if (transition == true){ //pour clics (reels ou simules) suivants : boucler rapidement puis trigger le dernier des clics suivants via transition
				dureeReglage = 350;
				transition = cible;
				$(":animated").stop(false,true);
				return;
			} else{
				transition = true; //vrai commencement
				transitionPartielle = [false,false];
				$(".contenu").removeData("partiel");
			}
			route.addClass("corset");
			menu.demeurer();
			ciblage = cible.situer();
			corps.situer();
			transiter[transitions[corps.niveau][ciblage[0]](corps.theme,ciblage[1])](adresse,cible);
		});

//API HTML5 :
		//Re-ecrire l'adresse de la page dans la barre d'url du navigateur et gerer la navigation dans l'historique
		if (adressage){
			var adresser = function(){ //shift() de relais dans descendre() et avancer()
				history.pushState({ adresse : relais[0][0] }, null, racine + relais[0][1].split("-").join("/"));
			}
			var radresser = function(zcontenu){ //a partir de retrograder()
				history.pushState({ adresse : zcontenu.data().adresse }, null, racine + zcontenu.data().affichage.split("-").join("/"));
			}
			var dresser = function(url){ //a partir de remplacer()
				history.pushState({ adresse : url }, null, racine + url.split("-").join("/"));
			}
			setTimeout(function(){
				// http://stackoverflow.com/questions/6421769/popstate-on-pages-load-in-chrome
				//			 if (!window.history.ready && !ev.originalEvent.state) ev.originalEvent.state n'est pas reconnu sur Safari
				//			 if (!window.history.ready) bloque tout pour Chrome
				window.onpopstate = function(ze){ //autotour : empecher le declenchement de adresser() par trigger
					if (! ze.state){
						history.pushState({ adresse : "accueil" }, null, racine);
						return $("a[href]:not(.immediat):eq(0)").trigger({ type : "click", cible : "accueil", autotour : true });
					}
					var recible = ze.state.adresse;
					if ($(".contenu").data().partiel && $(".contenu").data().adresse.split("-index")[0] == recible.split("-index")[0]){ //transitions partielles
						if (transitionPartielle[1] != false) $(":animated").stop(false,true);
						sommaire.filter("[href]:eq(0)").trigger({ type : "click", cible : recible });
					} else $("a[href]:not(.immediat):eq(0)").trigger({ type : "click", cible : recible, autotour : true });
		}	},350);}
//Agents utilisateurs HTML 4 :
		//Modifier l'adresse de la page dans la barre d'url du navigateur et gerer la navigation dans l'historique
		else{
			var adresser = function(){ //shift() de relais dans descendre() et avancer()
				window.collectionDInfini = "attends";
				document.location.hash = relais[0][1].split("-").join("/");
				setTimeout(function(){ window.collectionDInfini = false;},350);
			}
			var radresser = function(zcontenu){ //a partir de retrograder()
				window.collectionDInfini = "attends";
				document.location.hash = zcontenu.data().affichage.split("-").join("/");
				setTimeout(function(){ window.collectionDInfini = false;},350);
			}
			var dresser = function(url){ //a partir de remplacer()
				window.collectionDInfini = "attends";
				document.location.hash = url.split("-").join("/");
				setTimeout(function(){ window.collectionDInfini = false;},350);
			}
			window.onhashchange = function(){ //pas IE 7 cf. http://www.quirksmode.org/dom/events/index.html
				if (window.collectionDInfini) return;
				var cible = location.hash.substring(1);
				var recible = cible.length < 1 ? "accueil" : cible.indexOf("/") < 0 ? cible + "-index" : cible.split("/").join("-");
				if ($(".contenu").data().partiel && $(".contenu").data().adresse.split("-index")[0] == recible.split("-index")[0]){ //transitions partielles
					if (transitionPartielle[1] != false) $(":animated").stop(false,true);
					sommaire.filter("[href]:eq(0)").trigger({ type : "click", cible : recible });
				} else $("a[href]:not(.immediat):eq(0)").trigger({ type : "click", cible : recible, autotour : true });
		}	}

		//Injecter du contenu
		function introduire(adresse,reponse){
			if (adresse == 1) adresser();
			var injection = reponse.find(".contenu");
			corps.situer();
			injection.situer(1);
			if (transitions[corps.niveau][injection.niveau](corps.theme,injection.theme) == "verticale") descendre(reponse,injection,adresse);
			else avancer(reponse,injection,adresse);
		}

/* mutualiser les trois fonctions de manipulation ? */
		//Manipuler du contenu : transition vers le bas
		function descendre(reponse,injection,adresse){
			var animation = animations[ease];
			ease --;
			injection.addClass("attente verticale");
			contenu.prepend(reponse.html());
			var attente = $(".attente");
			var letitre = attente.find("h1");
			if (letitre.parents("#introduction").length > 0) document.title = titre; //page d'accueil
			else document.title = titre + " : " + letitre.text();
			attente.data({ adresse : relais[0][0], affichage : relais[0][1] });
			relais.shift();
			var hauteur = attente.height();
			attente.css({ top : -hauteur });
			attente.animate({ top : "+=" + hauteur },dureeReglage,animation);
			corps.css({ minHeight: hauteur});
			footer.animate({ top : hauteur + 12},dureeReglage,animation);
			var attenant = $(".contenu:eq(1)");
			attenant.animate({ top : "+=" + hauteur, opacity : 0 },dureeReglage,animation,function(){
				corps.attr("class",injection.classes);
				attenant.remove();
				attente.removeClass("attente verticale");
				if (requetes.length > 0){
					introduire(adresse,requetes[0]);
					requetes.shift();
				} else{
					menu.mener();
					route.removeClass("corset");
					if (transition != true) $("a[href]:not(.immediat):eq(0)").trigger({ type : "click", cible : transition });
					else{
						transition = false;
						immachiner();
		}	}	});	}

		//Manipuler du contenu : transition vers la droite
		function avancer(reponse,injection,adresse){
			var animation = animations[ease];
			ease --;
			injection.addClass("attente horizontale");
			contenu.append(reponse.html()); //append au lieu de prepend
			var attente = $(".attente");
			var letitre = attente.find("h1");
			if (letitre.parents("#introduction").length > 0) document.title = titre; //page d'accueil
			else document.title = titre + " : " + letitre.text();
			attente.data({ adresse : relais[0][0], affichage : relais[0][1] });
			relais.shift();
			var hauteur = attente.height();
			corps.css({ minHeight: hauteur});
			footer.animate({ top : hauteur + 12},dureeReglage,animation);
			var contenus = $(".contenu");
			var collecte = contenus.length - 1;
			contenus.animate({ left : "-=1180", opacity : 1 },dureeReglage,animation,function(){
				if ($(this).index() == collecte){
					attente.css({ marginTop : -contenus.eq(collecte - 1).height() });
					corps.attr("class",injection.classes);
					attente.removeClass("attente horizontale");
					if (requetes.length > 0){
						introduire(adresse,requetes[0]);
						requetes.shift();
					} else{
						menu.mener();
						route.removeClass("corset");
						if (corps.niveau == "niveau4" && requeste == 2) $(".croix").attr("href","ateliers-index");
						if (transition != true) $("a[href]:not(.immediat):eq(0)").trigger({ type : "click", cible : transition });
						else{
							transition = false;
							immachiner();
		}	}	}	});	}

		//Manipuler du contenu : transition vers la gauche
		function retrograder(adresse,zuite){ //zuite : 2 pour retrograder() * 2 ; -1 pour retrograder() + descendre() ; -2 pour retrograder() * 2 + descendre()
			var animation = animations[ease];
			ease --;
			var contenus = $(".contenu");

			var letitre = contenus.eq(0).find("h1");
			if (letitre.parents("#introduction").length > 0) document.title = titre; //page d'accueil
			else document.title = titre + " : " + letitre.text();
			var collecte = contenus.length - 1;
			if (collecte == 0){ //a priori cas evites par analyse de l'url au chargment de la page : if (service.length > 0) etc. - mais cf. aussi decompenser()
				if (adressage) return location.href = racine + location.href.split(racine).pop().split("/")[0] + "/index"; //le serveur re-ecrit
				else return location.href = racine + "#" + location.href.split(racine).pop().split("/")[0] + "/index"; //le serveur re-ecrit
			}
			if (adresse == 1) radresser(contenus.eq(collecte - 1));
			footer.animate({ top : contenus.eq(collecte - 1).height() + 12 },dureeReglage,animation);
			contenus.eq(collecte).animate({ left : "+=1180", opacity :0 },dureeReglage,animation);
			if (collecte == 2) contenus.eq(1).animate({ left : "+=1180" },dureeReglage,animation);
			contenus.eq(0).animate({ left : "+=1180" },dureeReglage,animation,function(){
				corps.removeClass("niveau" + eval(collecte + 2)).addClass("niveau" + eval(collecte + 1));
				contenus.eq(collecte).remove();
				if (zuite){
					if (zuite == 2) retrograder(adresse);
					else if (zuite == -1){
						introduire(adresse,requetes[0]);
						requetes.shift();
					} else if (zuite == -2) retrograder(adresse,-1);
				} else{
					menu.mener();
					route.removeClass("corset");
					if (transition != true) $("a[href]:not(.immediat):eq(0)").trigger({ type : "click", cible : transition });
					else{
						transition = false;
						immachiner(); //une partir prise en compte pour gestion du sommaire etc. : .ateliers.niveau3 et .exposition.ateliers3
		}	}	});	}

		//Precharger - le cas echeant - les pages principales du site
		if (memorisation){
			try{
				for (pa in localStorage){
					pages[pa] = localStorage[pa];
					principales[1] ++;
				}
			} catch(e){
				for (var i =0;i<localStorage.length;i++){ // FF 3.6
					var pa = localStorage[i];
					pages[pa] = localStorage.getItem(pa);
					principales[1] ++;
			}	}
			menu.principales.each(function(){
				var page = $(this).data("cible").split("/").pop();
				if (! localStorage[page]){
					// corps.addClass("installation");
					appeler(enracine + page + ".php",0,percevoir,-2,false,function(){ $("body").removeClass("installation"); },false,false,page,principales[0]);
		}	});	}
		else {
			corps.addClass("installation");
			menu.principales.each(function(){
				var page = $(this).data("cible").substring(1);
				appeler(enracine + page + ".php",0,percevoir,-2,false,function(){ $("body").removeClass("installation"); },false,false,page,principales[0]);
		});	}

		//Gerer l'arrivee sur le site par une autre page que la page d'accueil
		if (service.length > 0 && service != "accueil"){ //service correspond a une ressource fichier puisque affichage par le navigateur (on est onload)
			if (adressage){
				if (service.lastIndexOf("index") == service.length - 5) history.pushState({ adresse : service }, null, racine + service.split("-")[0]);
				else{ //sur IE : il n'y a pas de requete des contenus de niveaux inferieurs, mais rechargement sur l'accueil et transition vers la page initiale
					history.pushState({ adresse : service }, null, racine + service.split("-").join("/"));
					if (service.indexOf("index") < 0){
						var remblai = service.situer();
						var cibles = remblai[0] == "niveau3" ? [remblai[1] + "-index"] : [remblai[1] + "-" + remblai[2],remblai[1] + "-index"];
						raquettes = new Array(cibles.length);
						transition = true;
						//ATTENTION suppose que le 404 redirige bien...
						for (i in cibles){
							if (memorisation && localStorage[cibles[i]]){
								raquettes[i] = [$("<div>",{ "html" : localStorage.getItem(cibles[i]) }),cibles[i]];
								produire();
							} else appeler(enracine + cibles[i] + ".php",0,etayer,0,false,decompenser,false,false,cibles[i],i);
			}	}	}	}
			else{
				if (service.lastIndexOf("index") == service.length - 5) document.location.href = racine + "#" + service.split("-")[0]; 
				else document.location.href = racine + "#" + service.split("-").join("/"); //cf. obs. ci-dessus
		}	}
		else if (ancrage.length > 0){ //si l'equivalent de l'ancre est "accueil" ou une ressource inexistante, parametrages pour annuler l'ancre
			while (ancrage.indexOf("/") == 0) ancrage = ancrage.substring(1);
			while (ancrage.lastIndexOf("/") + 1 == ancrage.length) ancrage = ancrage.substring(0,ancrage.lastIndexOf("/"));
			if (ancrage == "accueil") return refuser();
			var ancre = ancrage.indexOf("/") < 0 ? ancrage + "-index" : ancrage.split("/").join("-");
			if (ancre.indexOf("inscription") > 0) ancre = ancre.split("-inscript")[0];
			appeler(enracine + ancre + ".php",0,accepter,0,false,refuser,false,false,ancre);
		}




/*
1.1)- GERER LES TRANSITIONS PARTIELLES								*/

		//Traiter la reponse a la requete ajax de contenus partiels
		window.prendre = function(zajax,zparam){
			var requis = $(zajax.responseXML.documentElement); //FF et webkit curieusmenent marchent aussi avec $(zajax.responseXML).html()
			var gnap = false;
			try{ gnap = typeof requis.html(); } //IE7 IE8
			catch(e){ gnap = "ie9"; } //m puissance 1000
			if (gnap == "undefined" || gnap == "ie9") requis = $("<div>",{ "html" : zajax.responseText }).find("div"); //IE
			var ciblant = zparam.split("ı")[0];
			emmagasiner("partiel-" + ciblant,requis.html());
			remplacer(requis,ciblant,zparam.split("ı")[1]);
		}

		// Gerer le menu de contenu partiel
		function sommer(){
			$(".contenu").data({ "partiel" : true });
			sommaire = $("#sousMenu a");
			sommaire.each(function(){
				$(this).data("cible",racine + $(this).attr("href").split("/").pop());
			});
			sommaire.mener = function(){
				$(this).each(function(){
					if ($(this).data().cible == racine + $(".contenu").data().adresse) return $(this).removeAttr("href").attr("title",$(this).text());
			});	}
			sommaire.demeurer = function(){
				$(this).each(function(){
					$(this).attr("href",$(this).data("cible")).removeAttr("title");
			});	}
			sommaire.mener();
			sommaire.click(function(ze){
				ze.preventDefault();
				if (transition != false || transitionPartielle[1] != false) return; //occupation du menu principal bloque le menu pariel
				if ($(this).attr("href")){
					transition = true; //l'occupation du menu secondaire retarde l'activation du menu principal
					transitionPartielle = [true,true];
					cible = ze.isTrigger ? ze.cible.split("/").pop() : $(this).attr("href").split("/").pop();
					if (pages["partiel-" + cible]) remplacer($("<div>",{ "html" : pages["partiel-" + cible] }),cible,ze.isTrigger);
					else appeler(rhizome + cible + ".php",0,prendre,-2,false,function(){ document.location.href = racine + cible; },false,false,cible,ze.isTrigger);
			}	});
			$("#inscription").live("click",function(ze){ //lien "je m'inscris" sur ateliers-indexcreatif et ateliers-indexgourmand
				ze.preventDefault();
				if (transition != false || transitionPartielle[1] != false) return; //occupation du menu principal bloque le menu pariel
				transition = true; //l'occupation du menu secondaire retarde l'activation du menu principal
				transitionPartielle = [true,true];
				if (pages["partiel-ateliers-index"]) remplacer($("<div>",{ "html" : pages["partiel-ateliers-index"] }),"ateliers-index",ze.isTrigger);
				else appeler(rhizome + "ateliers-index.php",0,prendre,-2,false,function(){ document.location.href = racine + "ateliers-index"; },false,false,"ateliers-index",ze.isTrigger);
		});	}
		/*
		impossible car tout trigger fait une transition partielle sans duree
	    <!-- <a href="< ?php echo $racine.'ateliers-index'; ?>" class="bt-facebookH immediat executif" data-execution="anamner" data-parametres="inscription" id="inscription">&#62; Je m'inscris</a> -->
		// function anamner(k){
		// 	$("#" + k).click(function(ze){
		// 		ze.preventDefault();
		// 		sommaire.filter("[href]:eq(0)").trigger({ type : "click", cible : racine + "ateliers-index" });
		// });	}
		*/
		//Manipuler du contenu partiel (transition vers le bas)
		function remplacer(reponse,ciblant,origine){
			if (typeof origine == "undefined" || origine.length == 0){
				dresser(ciblant);
				dureePartielle = duree *.66;
			} else dureePartielle = 1;
			$(".contenu").data({ adresse : ciblant, affichage : ciblant, partiel : true });
			sommaire.demeurer();
			sommaire.mener();
			var capsule = $(".capsule");
			reponse.find(".capsule").addClass("descente");
			$("#presentation").prepend(reponse.html());
			var descente = $(".descente");
			descente.css({ top : - descente.height() });
			capsule.animate({ opacity : 0},dureePartielle,animations[1],function(){
				$(this).remove();
			});
			descente.animate({ top : 0, opacity : 1},dureePartielle,animations[1],function(){
				$(this).removeClass("descente");
				transitionPartielle = [true,false];
				immachiner();
				if (transition != true) $("a[href]:not(.immediat):eq(0)").trigger({ type : "click", cible : transition });
				else transition = false;
		});	}

		//Gerer les transitions entre exposition et machines
		function valoriser(){
			$(".list-03H a").click(function(){
				$(".list-03H li").removeClass("valor");
				$(this).parent("li").addClass("valor");
		});	}
		function revaloriser(quoi){
			if ($(".contenu").length == 1){
				if (! window.decompte) window.decompte = 0;
				else if (decompte == 10) return decompte = 0;
				decompte ++;
				return setTimeout(function(){
					revaloriser(quoi);
				},500);
			} else if (typeof decompte != "undefined") decompte = 0;
			if ($(".list-03H").hasClass("executif")){
				$(".list-03H").removeClass("executif");
				valoriser();
			}
			$(".list-03H li").removeClass("valor");
			$("[href*=" + quoi + "]").parents("li").addClass("valor");
			$(".list-04H a").click(function(){
				var valeur = $(this).attr("href").split("/").pop().substring(1);
				$("[href*=" + valeur + "]").parents("li").addClass("valor");
				setTimeout(function(){
					$(".list-03H li").removeClass("valor");
					$("[href*=" + valeur + "]").parents("li").addClass("valor");
				},dureeReglage);
		});	}




/*
2.0)- AGIR DANS LES CONTENUS AU CHARGEMENT OU APRES TRANSITION							*/

		//Animer les diaporamas de la page d'accueil
		function tourner(qui){
			var diapos =  $("#diapo" + qui);
			var clavier = $("#clavier" + qui + " li");
			$("#clavier" + qui + " a").click(function(ze){
				ze.preventDefault();
				if (! ze.isTrigger) clearInterval(manege);
				var actif = $(this);
				if (actif.parent("li").hasClass("actif") || diapos.find(":animated").length > 0) return;
				var entree = actif.attr("href").split("/").pop().substring(1);
				var sortie = diapos.attr("class");
				var entrante = $("#" + entree);
				var sortante = $("#" + sortie);
				clavier.removeClass();
				actif.parent("li").addClass("actif");
				entrante.css({ opacity : 0 });
				diapos.addClass(entree);
				sortante.animate({ opacity : 0},dureeDiapo,"linear");
				entrante.animate({ opacity : 1},dureeDiapo,"linear",function(){
					diapos.removeClass(sortie);
					sortante.stop(false,false).css({ opacity : 1});
			});	});
			var claviers = $("#clavier" + qui + " a");
			var cycle = claviers.length - 1;
			var depart = 1;
			var manege = setInterval(function(){
				claviers.eq(depart).click();
				depart += depart == cycle ? - depart : 1;
			},dureeDiapo * 4);
		}
		//Animer automatiquement avec decalage
		function tournerMed(qui){
			setTimeout(function(){
				tourner(qui);
			},dureeDiapo / 3);
		}
		//Animer automatiquement avec decalage plus important
		function tournerFin(qui){
			setTimeout(function(){
				tourner(qui);
			},dureeDiapo * 2 / 3);
		}

		//Visualiser les vignettes des fiches ateliers
		function agrandir(qui){
			var cadre = $("#" + qui);
			var images = $("#" + qui + " .content-pictureT img");
			$("#" + qui + " .nav-pictureT img").mouseover(function(){
				cadre.find(".survol").removeClass("survol");
				cadre.add(images.eq($(this).parent("li").index())).addClass("survol");
		});	}

		//Voir les boissons openbar
		function servir(){
			var boissons = $("#sommaire ul a, #presentation li");
			$("#sommaire ul a").add("#boissons area").click(function(ze){
				ze.preventDefault();
				boissons.removeClass("actif");
				var boisson = $(this).attr("href").split("/").pop().substring(1);
				$("a[href$='" + boisson + "'], #" + boisson).addClass("actif");
		});	}




/*
2.1)- WS								*/

		// Afficher les commentaires HP - JSON independant
		function commenter(sujet){
			appeler(ws[2] + sujet,1,raconterHP,0,false,false,false,false);
		}
		window.raconterHP = function(zajax){
			var retour = $.parseJSON(zajax.responseText);
			var commentaire = $("#commentaires");
			var commentaires = "";
			var limite = retour.length > 9 ? 10 : retour.length;
			for (var i = 0;i<limite;i++) commentaires += "<dt>" + retour[i].name + "</dt><dd>" + retour[i].text + "</dd>";
			$("<dl>",{ "html" : commentaires}).appendTo(commentaire);
			commentaire.animate({ opacity : 1},dureeDiapo,"linear");
			setInterval(function(){
				$("#commentaires dt:eq(0), #commentaires dd:eq(0)").remove().appendTo($("#commentaires dl"));
			},dureeDiapo * 3.5);
		}


		// Appeler les commentaires ateliers (via verifier())
		function commenterAteliers(sujet){ //apparemment plusieurs adresses pour un flux (16 adresses, 7 flux en theorie 121121)
			appeler(ws[2] + "atelier/" + eval(sujet + 1),1,raconterDetail,0,false,false,false,false);
		}
		window.raconterDetail = function(zajax,zparam){
			var retour = $.parseJSON(zajax.responseText);
			var total = parseInt(retour.nbComTotal);
			if (total < 2) $("#total").text(total + " commentaire");
			else  $("#total").text(total + " commentaires");
			if (total > 0){
				var structure = $("#total").parent("div.commentairesH");
				structure.css({ height : structure.height() });
				$("<div>",{ "id" : "extraits" }).appendTo(structure);
				var extraits = $("#extraits");
				total = total > 3 ? 3 : total;
				for (var i = 0;i<total;i++){
					var commentaires = "";
					commentaires += '<h3>' + retour.comments[i].name + '</h3>';
					commentaires += '<img width="50" height="50" src="' + retour.comments[i].picture + '" alt="' + retour.comments[i].name + '" />';
					commentaires += '<p>' + retour.comments[i].text  + '</p>';
					commentaires += '<p>' + retour.comments[i].date  + '</p>';
					$("<div>",{ "html" : commentaires}).appendTo(extraits);
				}
				footer.animate({ top : "+=" + (extraits.height()) },1000,"linear");
				structure.animate({ height : "+=" + extraits.height()},1000,"linear");
		}	}
		// Appeler les commentaires machines (direct)
		function commenterMachines(sujet){
			appeler(ws[2] + "machine/" + sujet.substring(6),1,raconterDetail,0,false,false,false,false);
		}

		//Soumettre le formulaire
		window.accorder = function(zajax,zparam){
			var retour = $.parseJSON(zajax.responseText);
			$("form p:eq(0) strong").remove();
			var ddiv = $("form").parent("div");
			ddiv.css({ height : ddiv.height() });
			if (retour.status == true){
				ddiv.find("form").remove();
				$("<p>",{ "class" : "confirmation", "html" : confirmation[0]}).appendTo(ddiv);
				$("<a>",{ "class" : "bt-facebookH", "href" : racine + "ateliers-index", "text" : agenda }).appendTo(ddiv);
				if (route.hasClass("bfFB") && typeof FB != "undefined" && FB != null){ //participation FB uniquement si connecte
					FB.api(
						"/me/" + ffbb[2] + ":participate",
						"post",
						{ 
							workshop : zparam.split("ı")[0],
							end_time : window.timestamp,
							place: "206593739352097"
						},
						function(zrep){ 
							if (! zrep || zrep.error) console.log(zrep.error);
							else console.log("participation prise en compte - " + zrep);
			});	}	}
			else{
/* confirmation[1] = "Veuillez v\xE9rifier que vous avez saisi correctement<br />tous les champs obligatoires";
confirmation[2] = "L'atelier est d\xE9sormais complet :<br />nous regrettons de ne pouvoir vous y inscrire.";
confirmation[3] = "Un utilisateur identique est d\xE9j\xE0 inscrit \xE0 cet atelier :<br />nous regrettons de ne pouvoir vous y inscrire.";
- format incorrect de saisie => (Invalid date kid's birthday, Bad mail address, Invalid date birthday, Invalid Zip, Invalid Gender, Invalid Phone, There is/are one or more missing parameters)
- atelier complet => stand already full
- utilisateur deja inscrit => User is already subscribed at this stand */
				var erreur = parseInt(retour.code);
				if (erreur == 1) $("<strong>",{ "class" : "confirmation", "html" : confirmation[erreur] }).prependTo($("form p:eq(0)"));
				else{
					ddiv.find("form").remove();
					$("<p>",{ "class" : "confirmation", "html" : $("<strong>",{ "html" : confirmation[erreur] })}).appendTo(ddiv);
					$("<a>",{ "class" : "bt-facebookH", "href" : racine + "ateliers-index", "text" : agenda }).appendTo(ddiv);
		}	}	}


		// Verifier la disponibilite des ateliers - construction dynamique de l'equivalence index JSON - nouveau JSON toutes les 30 secondes
		function verifier(appelant){
			if (window.khops && ateliers !== false && ateliers !== true){ //a la queue leu leu acte 1 : constuction de l'index dynamique
				window.kh = window.khops;
				window.khops = false;
				for (var i = 0;i<window.kh.length;i++) eval(window.kh[i]);
			}
			if (ateliers === false){ //construction de l'index dynamique 121121
				ateliers = true;
				retours[0] = true;
				return appeler(ws[0],1,function(zajax,zparam){
					retours[0] = $.parseJSON(zajax.responseText);
					retours[1] = new Date().getTime();
					var indexation = retours[0];
					var indexid = new Array();
					for (var i = 0;i<indexation.length;i++) indexid[i] = parseInt(indexation[i].id) - 1;
					ateliers = new Array();
					for (var i = 0;i<agencement;i++) ateliers[i] = new Array();
					for (var i = 0;i<indexid.length;i++) ateliers[ateliersId[indexid[i]]].push(i);
					verifier(zparam.split("ı")[0]);
				},0,false,false,false,false,appelant);
			} else if(ateliers === true){ //mise en file
				if (! window.khops) window.khops = [];
				return khops.push("verifier('" + appelant + "')");
			}
			if (appelant.indexOf("comate") == 0) return commenterAteliers(parseInt(appelant.substring(6))); //rustine pour dynamisation de la var ateliers 121121

//thks bck la gadoue

			//les if precedents sauf le premier : return
			if (retours[0] === false){ //construction des donnees d'ou seconde queue
				retours[0] = true;
				appeler(ws[0],1,retourner,0,false,false,false,false,appelant);
			} else{
				if (retours[0] === true){
					if (! window.pain) window.pain = [];
					pain.push("enfourner(retours[0],'" + appelant + "')");
				} else if (new Date().getTime() - retours[1] < 30000) enfourner(retours[0],appelant);
				else{
					retours[0] = true;
					appeler(ws[0],1,retourner,0,false,false,false,false,appelant);
		}	}	}
		window.retourner = function(zajax,zparam){
			retours[0] = $.parseJSON(zajax.responseText);
			retours[1] = new Date().getTime();
			enfourner(retours[0],zparam.split("ı")[0]);
			if (window.pain){
				for (var i = 0;i<window.pain.length;i++) eval(window.pain[i]);
				window.pain = false;
		}	}
		function enfourner(retour,appelant){
			var retour = retour;
			if (appelant == "index"){ //agenda
				$(".float-lH").each(function(zi){
					if (retour[ateliers[zi][0]].ouvert == false){
						var item  = $(this);
						var lien = item.find("a:eq(0)");
						lien.removeAttr("href"); //laisser lien pour la construction css : IE 7 ne prend "+" que statique
						lien.find("img").animate({ opacity: 0 },1000,"linear",function(){
							$(this).remove();
							item.addClass("passe");
					});	}
					else {
						var place = retour[ateliers[zi][0]].nbPlace - retour[ateliers[zi][0]].nbPlacesPrises;
						if (ateliers[zi].length == 2) place += retour[ateliers[zi][1]].nbPlace- retour[ateliers[zi][1]].nbPlacesPrises;
						if (place == 0){
							var item  = $(this);
							var lien = item.find("a:eq(0)");
							lien.removeAttr("href"); //laisser lien pour la construction css : IE 7 ne prend "+" que statique
							lien.find("img").animate({ opacity: 0 },1000,"linear",function(){
								$(this).remove();
								item.addClass("complet");
			});	}	}	});	}
			else if (appelant == "creatifs"){ //index bis
//agir sur #inscription ?
			}
			else if (appelant == "gourmands"){ //index bis
//agir sur #inscription ?
			}
			else if (appelant.indexOf("dispo") == 0){ //fiches : dispo (par lien d'inscription)
				var lesquels = ateliers[parseInt(appelant.split("dispo")[1])];
				if (retour[lesquels[0]].ouvert == false){
					$("[data-parametres*='" + appelant + "']").animate({ opacity : 0},500,"linear",function(){
						$(this).remove();
					});
				} else{
					var place = 0;
					for (var i = 0;i<lesquels.length;i++) place += retour[lesquels[i]].nbPlace - retour[lesquels[i]].nbPlacesPrises;
					if (place == 0){
						$("[data-parametres='" + appelant + "']").animate({ opacity : 0},500,"linear",function(){
							$(this).remove();
			});	}	}	}
			else if (appelant.indexOf("inscrits") == 0){ //fiches : inscrits (pour l'ensemble de la page)
				var inscrits = appelant.split("inscrits")[1].split("-");
				var lesquels = new Array();
				for (var i = 0;i<inscrits.length;i++) for (var j = 0;j<ateliers[inscrits[i]].length;j++) lesquels.push(ateliers[inscrits[i]][j]);
				inscrits = 0;
				for (var i = 0;i<lesquels.length;i++) inscrits += retour[lesquels[i]].nbPlacesPrises;
				if (inscrits < 2) $("[data-parametres='" + appelant + "']").text(inscrits + " participant");
				else $("[data-parametres='" + appelant + "']").text(inscrits + " participants");
			}
			else if (appelant == "remplir"){ //formulaires
				$("form").submit(function(ze){
					ze.preventDefault();
					window.timestamp = retour[parseInt($("#id").val()) - 1].start_date; //121119 : rajout dans json par JL car RK : besoin pour participer()
					var naissances = $(".naissance");
					var dates = new Array();
					try{
						naissances.each(function(){
							$(this).css({ color : "#E9E2DA"});
							dates.push($(this).val());
							var datant = $(this).val().split("/");
							$(this).val(new Date(parseInt(datant[2]), parseInt(datant[1] - 1), parseInt(datant[0]), 0, 0, 0, 0).getTime() / 1000);
						});
					} catch(e){ }
//re-envisager stringify ????
					var envoi1 =  $(this).serializeArray();
					for (p in envoi1) envoi1[p].value = envoi1[p].value.split(" ").join("ı"); //param() remplace espacements par +
					var envoi2 = decodeURIComponent('{"' + $.param(envoi1).split("=").join('":"').split("&").join('","') + '"}'); //121119 : je rajoute decodeURIComponent
					var envoi = envoi2.split("ı").join(" ");
					for (var i = 0;i<dates.length;i++) naissances.eq(i).val(dates[i]).css({ color : "#000" });
					appeler(ws[1],1,accorder,-2,false,function(){ alert("Nous sommes d\xE9sol\xE9s de n'avoir pu prendre en compte votre inscription"); },"POST",envoi,$(this).attr("action"));
				});
				var lesquels = ateliers[parseInt($("#seances").val())];
				if (retour[lesquels[0]].ouvert == false) $("a[href]:not(.immediat):eq(0)").trigger({ type : "click", cible : $(".contenu:last").data("adresse").split("-inscript")[0] });
				else{
					var place = 0;
					if (lesquels.length == 2) lesquels[1] = parseInt(lesquels[1]) - 1;
					var places = new Array();
					for (var i = 0;i<lesquels.length;i++){
						places[i] = retour[lesquels[i]].nbPlace - retour[lesquels[i]].nbPlacesPrises;
						place += places[i];
					}
					if (place == 0) $("a[href]:not(.immediat):eq(0)").trigger({ type : "click", cible : $(".contenu:last").data("adresse").split("-inscript")[0] });
					else{
						if (lesquels.length == 2){
							var lequel = places[0] == 0 ? 1 : places[1] == 0 ? 0 : -1;
							if (lequel > -1){
								var seant = $("option:eq(" + lequel + ")");
								var seance = [seant.text(),seant.val().toString()];
								$("label:eq(0)").removeAttr("for");
								$("#id").remove();
								$("<input>", { "type" : "text", "class": "seance", "value" : seance[0], "disabled" : "disabled" }).appendTo($("form p:eq(0)"));
								$("<input>", { "type" : "hidden", "id" : "id", "name" : "id", "value" : seance[1] }).appendTo($("form p:eq(0)"));
						}	}
						remplir(lesquels[0]);
		}	}	}	}

		// Pre-remplir un formulaire avec les donnees deja saisies
		function remplir(n){ //action utilisateur
			$("[type='text']:not([disabled]), #gender").each(function(){
				var laquelle = $(this).attr("id");
				if (donnees[laquelle]) $(this).val(donnees[laquelle]);
				$(this).change(function(){
					donnees[laquelle] = $(this).val().length == 0 ? " " : $(this).val();
			});	});
			if (donnees["optmachine"]) $("[type='radio']").val([donnees["optmachine"]]);
			$("[type='radio']").each(function(){
				$(this).change(function(){
					donnees["optmachine"] = $(this).val();
			}); });
			$("[type='checkbox']").each(function(){
				var laquelle = $(this).attr("id");
				if (donnees[laquelle]) $(this).val([donnees[laquelle]]); //$(this).attr("checked","checkded");
				$(this).change(function(){
					if ($(this).is(":checked")) donnees[laquelle] = $(this).val();
					else donnees[laquelle] = false;
			});	});
			if (typeof utilisateur == "undefined") attendant = "synremplir"; //cf. accueillir() dans phase.js
			else synremplir();
		}




/*
2.2)- API								*/

		// Pre-remplir un formulaire avec les donnees FaceBook - cf. phase.js 
		window.synremplir = function(){ //action FB, doit laisser la couche utilisateur integre
			if ($(".contenu:last form").length > 0){
				if (! donnees["gender"]){
					donnees["gender"] = utilisateur["gender"] == "female" ? "Madame" : "Monsieur";
					$("#gender").val(donnees["gender"]);
				}
				for (var i = 1;i<preremplissage.length;i++){
					$(".contenu:last form").find("#" + preremplissage[i]).each(function(){
						if (! donnees[preremplissage[i]]){
							if (preremplissage[i] == "birthday"){
								var redate = utilisateur[preremplissage[i]].split("/");
								donnees["birthday"] = redate[1] + "/" + redate[0] + "/" + redate[2];
							} else donnees[preremplissage[i]] = utilisateur[preremplissage[i]];
							$(this).val(donnees[preremplissage[i]]);
		}	});	}	}	}

		// Activer les interfaces FaceBook dans le contenu injecte
		function relier(){ //http://stackoverflow.com/questions/11655878/load-facebook-like-buttons-by-ajax
			if (typeof FB != "undefined" && FB != null && route.hasClass("bf")) FB.XFBML.parse(); //uniquement acces par transition
				//sinon, en acces direct, double requete de http://static.ak.fbcdn.net/rsrc.php/v2/ etc.
		}

		//Recommander
		window.recommander = function(){
			if (! route.hasClass("bfFB")) attendant = "recommander"; //cf. phase.js
			else{
				$(".bfFB .exposition.niveau3 .bt-facebookH").click(function(ze){
					ze.preventDefault();
					if (typeof FB != "undefined" && FB != null){ //double verification
						FB.api(
							"/me/" + ffbb[2] + ":recommend",
							"post",
							{ artist :  $(this).attr("href") },
							function(zrep){ 
								if (! zrep || zrep.error) console.log(zrep.error);
								else console.log("recommandation prise en compte - " + zrep);
		}	);	}	});	}	}

		//Ouvrir une fenetre commentaires FB
		function ajouterCommentaires(atelier){
//au close : detecter que connecte



























			$("#cfb").click(function(ze){
				ze.preventDefault();
				window.open("http://" + domaine + racine + "popupFB.php?atelier=" + atelier,"commentairesFB","location=1,status=1,scrollbars=1,toolbar=1,menubar=1,width=590,height=750");
		});	}

		// Afficher carte Google
		function localiser(){
			var positions = new google.maps.LatLng(48.8593925,2.3529816);
			var optionsCarte = {
				mapTypeControl : true,
				center : positions,
				navigationControlOptions : {
					style : google.maps.NavigationControlStyle.SMALL
				},
				mapTypeId : google.maps.MapTypeId.ROADMAP,
				zoom : 15
			}
			var carte = new google.maps.Map(document.getElementById("localisation"),optionsCarte);
			var marqueur = new google.maps.Marker({
				position : positions,
				map : carte,
				title : "L'Imprimerie"
		});	}

		// Afficher popin superbox
		function superboxer(){
			$.superbox.settings = {
				overlayOpacity: .4, // Opacité du fond
				closeTxt:''
			};
			$.superbox();
			
		/* 130116 gaelan : instruction suivante inutile et param_scale indefini
			
			return;

			???? */

			$('.list-06H li a').on('click',function(){
				var params_scale = $('#menu').attr('style');
				$('#superbox-overlay').attr('style', 'display: block; opacity: 1;'+params_scale);
		    });
		}
		
		// Afficher pages suivante
		function paginer(){
			/* 130116 gaelan :
				limiter a une occurence l'appel de cette fonction
				mettre d'office le gallery-01 en visible et en caler les style (float !) pour reguler l'effet de transion intermediaire
				$(".bt-pagination").click() plutot que [].each() ? */
			var all_gallery = jQuery('.gallery');
		  	var btn_pagination = ['01','02','03','04','05','06'];
		  	
		  	jQuery('.gallery-01').show();
		  	
		  	var Display = function(index,event){
		  		all_gallery.hide();
		  		jQuery('.gallery-'+btn_pagination[index]).fadeIn();
		      };
		  	
		    	jQuery.each(btn_pagination, function(index, value) {
		      	jQuery('.bt-'+value).on('click',function(event){
		  			Display(index,event);
		         	});
		      });
		}
		
		// Lire video
		function projeter(){
			var laVideo = "video" + new Date().getTime();
			$("video").attr("id",laVideo);
			var salles = $(".list_videos li a");
			var curseur = -1;
			var recurseur;
			var ecran = $("#videos");
			var toile = $("#loader");
			var video = _V_(laVideo,{ },function(){
				this.volume(.4);
			});
			salles.click(function(ze){
				ze.preventDefault();
				var recurseur = $(this).parent("li").index();
				if (recurseur != curseur){
					curseur = recurseur;
					video.src(videos[curseur]);
				}
				$(".contenu").css({ "z-index" : "auto" }); //aucun effet sur IE 7
				corps.addClass("projection");
				ecran.addClass("ecran");
				video.play();
				toile.one("click",function(ze){ //pas sur IE 7 (question de z-index)
					ze.stopPropagation();
					ze.preventDefault;
					video.pause();
					ecran.removeClass("ecran");
					corps.removeClass("projection");
					$(".contenu").css({ "z-index" : "1" });
			});	});
			$("#videos > a").click(function(ze){
				ze.preventDefault();
				toile.click();
		});	}





/*
attention dans
			if (transition != true) $("a[href]:not(.externe):eq(0)").trigger({ type : "click", cible : transition });
			else{
				transition = false;
				immachiner();
si le trigger n'enclenche rien (lien recursif par ex)
pas de immachiner ?

DECLENCHER IMMACHINER QUOI QU'IL EN SOIT ?

ps : deje pris en compte dans remplacer()
*/

		// Detecter les fonctions a lancer selon les contenus onload ou apres transition
		function immachiner(){
			var viamachina = $(".contenu:last .executif"); 
			if (viamachina.length > 0){
				viamachina.each(function(zi){
					eval($(this).data().execution)($(this).data().parametres); //ou $(this).attr("data-execution") ?
						//ps : $(this).attr("data-execution") aurait permis de spliter les parametres
						//pss : mieux aussi de transmettre l'element en parametre, $(this) (plutot que passer son id via data-execution)
						//	et dispo0 ???? d'ou url de ws in data-parametres ???
					$(this).removeClass("executif"); //contenu presente par retrograder() : pas necessairement deja mouline par immachiner()
						//cf. d'ailleurs rajout de immixer
			});	 }
			if ($(".contenu:last").hasClass("ateliers niveau3") || $(".contenu:last").hasClass("exposition niveau3")) immixer();
		}
		function immixer(){ //et quelque fois aussi dans un contenu de niveau 2 a partir d'une page de niveau 3 chargee directement
			if ($(".contenu").length == 1){
				if (! window.decompte) window.decompte = 0;
				else if (decompte == 10) return decompte = 0;
				decompte ++;
				return setTimeout(function(){
					immixer();
				},500);
			} else if (typeof decompte != "undefined") decompte = 0;
			$(".contenu:eq(0) .executif").each(function(){
				var selection = $(this).data().execution;
				if (selection == "sommer" || selection == "verifier"){
					$(this).removeClass("executif");
					eval(selection)($(this).data().parametres);
		}	});	}
		immachiner();

		/*
		//surveiller le chargement des images annexees au contenu
		var leCode = reponse.html();
		var combienDImages = leCode.split("<img").length > leCode.split("<IMG").length ? leCode.split("<img").length : leCode.split("<IMG");
		var combienDImagesChargees = 1; //car split()
		contenu.prepend(reponse.html()).find("img").load(function(){
			combienDImagesChargees ++;
			if (combienDImagesChargees == combienDImages) console.log("ok")
		})*/

});	})(jQuery);




/*
3.0)- ROUTINE AJAX								*/

function appeler(ou,type,traiter,combien,rappeler,compenser,comment,que){ //manque gestion mieux raisonnee des erreur
	/* personnalisation pour effet d'attente */
	if (traiter == recevoir || traiter == etayer) document.body.className += " attente";

	var ajax = false;
	var flux = false;
	if (window.XMLHttpRequest){ 
		ajax = new XMLHttpRequest();
		if (type == 0 && ajax.overrideMimeType) ajax.overrideMimeType("text/xml");
	} else if (window.ActiveXObject){
		try{ ajax = new ActiveXObject("Msxml2.XMLHTTP"); }
		catch(e){
			try{ ajax = new ActiveXObject("Microsoft.XMLHTTP"); }
			catch(e){ }
	}	}
	if (ajax){
		flux = true;
		var parametres = new Array();
		for (i=8;i<arguments.length;i++) parametres.push(arguments[i]);
		ajax.onreadystatechange = function(){
			try{ 
				if (ajax.readyState == 4){
					if (ajax.status == 200 || ajax.status == 0){
						if (type == 1 && ajax.getResponseHeader("Content-Type") == "text/html") flux = false;
						else{
							try{ traiter(ajax,parametres.join("ı")); }
							catch(e){
								if (rappeler) rappeler(parametres.join("ı"));
								else flux = false;
					}	}	} else flux = false;
			}	}
			catch(e){ flux = false; }
			if (! flux){ 
				ajax.abort();
				if (combien){
					if (combien > 100) setTimeout("document.location.reload();",combien);
					else if (combien < 0) appeler(ou,type,traiter,combien + 1,rappeler,compenser,comment,que,parametres.join("ı"));
				} else if (compenser) compenser(parametres.join("ı"));
		}	}
		ajax.open(comment || "GET",ou + (ou.indexOf("?") >= 0 ? "&" : "?") + "ajaxcache=" + new Date().getTime(),true);
//extension pour l'envoi de donnees formulaire (futur formdata) :
		if (comment && comment == "POST"){
			var envoi = jQuery.parseJSON(que);
			var borne = Math.random().toString().substr(2);
			var info = "";
			for (var cle in envoi) info += "--" + borne + "\r\nContent-Disposition: form-data; name=" + cle + "\r\nContent-type: application/octet-stream" + "\r\n\r\n" + envoi[cle] + "\r\n";
			info += "--" + borne + "--\r\n";
			ajax.setRequestHeader("content-type","multipart/form-data; charset=utf-8; boundary=" + borne);
			ajax.send(info);
		} else ajax.send(null);


/*		if (comment && comment == "POST"){
			ajax.setRequestHeader("Content-type","application/x-www-form-urlencoded");
			ajax.setRequestHeader("Content-length",que.length);
			ajax.setRequestHeader("Connection","close");
		}
		ajax.send(que || null); */
}


}






