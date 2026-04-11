import { useState } from 'react'

const PROVINCES = [
  { value: '', label: 'Province (optional)' },
  { value: 'Alberta', label: 'Alberta' },
  { value: 'British Columbia', label: 'British Columbia' },
  { value: 'Manitoba', label: 'Manitoba' },
  { value: 'New Brunswick', label: 'New Brunswick' },
  { value: 'Newfoundland and Labrador', label: 'Newfoundland and Labrador' },
  { value: 'Northwest Territories', label: 'Northwest Territories' },
  { value: 'Nova Scotia', label: 'Nova Scotia' },
  { value: 'Nunavut', label: 'Nunavut' },
  { value: 'Ontario', label: 'Ontario' },
  { value: 'Prince Edward Island', label: 'Prince Edward Island' },
  { value: 'Quebec', label: 'Quebec' },
  { value: 'Saskatchewan', label: 'Saskatchewan' },
  { value: 'Yukon', label: 'Yukon' },
]

const CITIES_BY_PROVINCE = {
  'Ontario': [
    'Toronto','Ottawa','Hamilton','Mississauga','Brampton','Kitchener','London','Markham',
    'Oshawa','Vaughan','Windsor','St. Catharines','Oakville','Richmond Hill','Burlington','Sudbury',
    'Barrie','Guelph','Whitby','Cambridge','Milton','Ajax','Waterloo','Thunder Bay',
    'Brantford','Chatham','Clarington','Pickering','Niagara Falls','Newmarket','Peterborough','Kawartha Lakes',
    'Caledon','Belleville','Sarnia','Sault Ste. Marie','Welland','Halton Hills','Aurora','North Bay',
    'Stouffville','Cornwall','Georgina','Woodstock','Quinte West','St. Thomas','New Tecumseth','Innisfil',
    'Bradford West Gwillimbury','Timmins','Lakeshore','Brant','Leamington','East Gwillimbury','Orangeville','Orillia',
    'Stratford','Fort Erie','LaSalle','Centre Wellington','Grimsby','King','Woolwich','Clarence-Rockland',
    'Midland','Lincoln','Wasaga Beach','Collingwood','Strathroy-Caradoc','Thorold','Amherstburg','Tecumseh',
    'Essa','Owen Sound','Brockville','Kingsville','Springwater','Scugog','Uxbridge','Wilmot',
    'Essex','Oro-Medonte','Cobourg','South Frontenac','Port Colborne','Huntsville','Russell','Niagara-on-the-Lake',
    'Middlesex Centre','Selwyn','Tillsonburg','Pelham','Petawawa','North Grenville','Loyalist','Port Hope',
    'Pembroke','Bracebridge','Greater Napanee','Kenora','Mississippi Mills','St. Clair','West Lincoln','West Nipissing / Nipissing Ouest',
    'Clearview','Thames Centre','Carleton Place','Guelph/Eramosa','Central Elgin','Saugeen Shores','Ingersoll','South Stormont',
    'Severn','South Glengarry','North Perth','Trent Hills','The Nation / La Nation','West Grey','Gravenhurst','Perth East',
    'Wellington North','Brighton','Tiny','Hawkesbury','Brock','Erin','Kincardine','Elliot Lake',
    'Arnprior','North Dundas','Wellesley','Georgian Bluffs','Norwich','Meaford','Adjala-Tosorontio','Hamilton Township',
    'South Dundas','Lambton Shores','North Dumfries','Mapleton','Rideau Lakes','North Glengarry','South Huron','Penetanguishene',
    'Tay','Cavan Monaghan','Temiskaming Shores','Grey Highlands','Alfred and Plantagenet','Elizabethtown-Kitley','Smiths Falls','Ramara',
    'Leeds and the Thousand Islands','Brockton','Laurentian Valley','Mono','Malahide','Huron East','Beckwith','Shelburne',
    'West Perth','Champlain','Minto','South Bruce Peninsula','Renfrew','Plympton-Wyoming','Kapuskasing','Zorra',
    'Kirkland Lake','Aylmer','Puslinch','Drummond/North Elmsley','Hanover','Dryden','Fort Frances','Goderich',
    'Stone Mills','South-West Oxford','Douro-Dummer','McNab/Braeside','Central Huron','Blandford-Blenheim','Bayham','Augusta',
    'St. Marys','Southgate','Bluewater','East Zorra-Tavistock','Otonabee-South Monaghan','Huron-Kinloss','The Blue Mountains','Whitewater Region',
    'Edwardsburgh/Cardinal','Wainfleet','North Stormont','Alnwick/Haldimand','Arran-Elderslie','Parry Sound','Muskoka Falls','Perth',
    'Cramahe','North Middlesex','Dysart et al','Hindon Hill','Tweed','Oliver Paipoonge','Petrolia','Southwest Middlesex',
    'Front of Yonge','Tay Valley','South Bruce','Ashfield-Colborne-Wawanosh','Trent Lakes','Gananoque','Lanark Highlands','Cochrane',
    'Sioux Lookout','Hearst','Breslau','Stirling-Rawdon','Espanola','West Elgin','East Ferris','North Huron',
    'Southwold','Centre Hastings','Lucan Biddulph','Greenstone','Tyendinaga','Iroquois Falls','Havelock-Belmont-Methuen','Central Frontenac',
    'Seguin','Madawaska Valley','Deep River','Asphodel-Norwood','Red Lake','Hastings Highlands','Prescott','Northern Bruce Peninsula',
    'Casselman','Callander','Amaranth','Marmora and Lake','Bancroft','Howick','Dutton/Dunwich','Perth South',
    'Montague','Warwick','Bonnechere Valley','Morris-Turnberry','Mulmur','Blind River','Powassan','Highlands East',
    'East Hawkesbury','Marathon','Shuniah','Sables-Spanish Rivers','Lake of Bays','Merrickville','Adelaide-Metcalfe','Melancthon',
    'Laurentian Hills','Grand Valley','Admaston/Bromley','North Algona Wilberforce','Wawa','Horton','Enniskillen','Atikokan',
    'Markstay','Northeastern Manitoulin and the Islands','McDougall','French River / Rivière des Français','East Garafraxa','Greater Madawaska','Georgian Bay','North Kawartha',
    'Perry','Black River-Matheson','Killaloe, Hagarty and Richards','Alvinston','Algonquin Highlands','Addington Highlands','Neebing','Bonfield',
    'Central Manitoulin','Madoc','Mattawa','Dawn-Euphemia','Chapleau','Manitouwadge','Wellington','Frontenac Islands',
    'Point Edward','North Frontenac','Komoka','Deseronto','Nipissing','Huron Shores','Nipigon','Burford',
    'Terrace Bay','Macdonald, Meredith and Aberdeen Additional','Brudenell, Lyndoch and Raglan','Moosonee','Englehart','Strong','Lappe','Armour',
    'Faraday','Bayfield','St.-Charles','Emo','Smooth Rock Falls','Chisholm','Thessalon','Conestogo',
    'St. Joseph','Moonbeam','Claremont','Ignace','Armstrong','Hillsburgh','Sagamok','Hensall',
    'Carling','Laird','Tara','Cobalt','South River','McKellar','South Algonquin','Sioux Narrows-Nestor Falls',
    'Beachburg','Schreiber','Plantagenet','Papineau-Cameron','Assiginack','Prince','Athens','Chatsworth',
    'Magnetawan',
  ],
  'Quebec': [
    'Montréal','Quebec City','Laval','Gatineau','Longueuil','Sherbrooke','Lévis','Saguenay',
    'Trois-Rivières','Terrebonne','Saint-Jérôme','Saint-Jean-sur-Richelieu','Brossard','Repentigny','Drummondville','Châteauguay',
    'Granby','Mirabel','Blainville','Lac-Brome','Saint-Hyacinthe','Beloeil','Mascouche','Shawinigan',
    'Joliette','Rimouski','Dollard-des-Ormeaux','Victoriaville','Saint-Eustache','Vaudreuil-Dorion','Salaberry-de-Valleyfield','Rouyn-Noranda',
    'Boucherville','Sorel-Tracy','Côte-Saint-Luc','Pointe-Claire','Val-d’Or','Chambly','Alma','Sainte-Julie',
    'Saint-Constant','Magog','Boisbriand','Sainte-Thérèse','La Prairie','Saint-Bruno-de-Montarville','Thetford Mines','Sept-Îles',
    'Hudson','Saint-Lin--Laurentides','L’Assomption','Candiac','Saint-Lambert','Saint-Lazare','Varennes','Mont-Royal',
    'Baie-Comeau','Rivière-du-Loup','Saint-Augustin-de-Desmaures','Sainte-Marthe-sur-le-Lac','Westmount','Les Coteaux','Kirkland','Dorval',
    'Beaconsfield','Mont-Saint-Hilaire','Deux-Montagnes','Saint-Colomban','Sainte-Catherine','Saint-Basile-le-Grand','L’Ancienne-Lorette','Saint-Charles-Borromée',
    'Cowansville','Sainte-Anne-des-Plaines','Gaspé','Pincourt','Mercier','Lavaltrie','Lachute','Rosemère',
    'Matane','Mont-Laurier','Mistassini','Beauharnois','Bécancour','Sainte-Sophie','Val-des-Monts','Saint-Amable',
    'Sainte-Marie','Amos','Prévost','Sainte-Adèle','Sainte-Agathe-des-Monts','Les Îles-de-la-Madeleine','Carignan','L’Île-Perrot',
    'Montmagny','Cantley','Notre-Dame-de-l\'Île-Perrot','Bromont','La Tuque','Rawdon','Saint-Félicien','Roberval',
    'Bois-des-Filion','Marieville','Saint-Sauveur','Stoneham-et-Tewkesbury','Mont-Tremblant','Saint-Zotique','Saint-Raymond','Lorraine',
    'Notre-Dame-des-Prairies','Sainte-Julienne','Donnacona','L’Epiphanie','Pont-Rouge','Coaticook','La Pêche','Otterburn Park',
    'Sainte-Brigitte-de-Laval','Sainte-Catherine-de-la-Jacques-Cartier','Farnham','Delson','La Malbaie','Boischatel','Beauport','Saint-Hippolyte',
    'Old Chelsea','Saint-Apollinaire','Nicolet','Contrecoeur','La Sarre','Chandler','Acton Vale','Saint-Philippe',
    'Rigaud','Louiseville','Chibougamau','Coteau-du-Lac','Saint-Rémi','Les Cèdres','Baie-Saint-Paul','Brownsburg',
    'Asbestos','Hampstead','Saint-Joseph-du-Lac','Plessisville','Sainte-Anne-des-Monts','Saint-Lambert-de-Lauzon','Val-Shefford','Port-Cartier',
    'Saint-Paul','Shannon','Saint-Honoré','Beauceville','Beaupré','Charlemagne','Mont-Joli','Pointe-Calumet',
    'Pontiac','L\'Ange-Gardien','Saint-Félix-de-Valois','McMasterville','Saint-Calixte','Lac-Mégantic','Saint-Henri','Verchères',
    'Richelieu','Princeville','Saint-Césaire','Val-David','Notre-Dame-du-Mont-Carmel','Sainte-Martine','Saint-Roch-de-l\'Achigan','Saint-Pie',
    'Windsor','Montréal-Ouest','Témiscouata-sur-le-Lac','Sainte-Anne-de-Bellevue','Mont-Orford','Saint-Germain-de-Grantham','Saint-Cyrille-de-Wendover','Chisasibi',
    'Chertsey','Lanoraie','Warwick','Napierville','Waterloo','Saint-Joseph-de-Beauce','Berthierville','Rivière-Rouge',
    'Saint-Denis-de-Brompton','Amqui','Saint-Mathias-sur-Richelieu','Saint-Boniface','Château-Richer','Montréal-Est','Saint-Antonin','Saint-Jean-de-Matha',
    'La Pocatière','Roxton Pond','Saint-Étienne-des-Grès','Saint-Donat','Métabetchouan-Lac-à-la-Croix','Maniwaki','Danville','Lac-Etchemin',
    'Saint-Jacques','L’Islet-sur-Mer','Carleton-sur-Mer','Oka','Morin-Heights','Crabtree','Saint-Tite','New Richmond',
    'Baie-d’Urfé','Saint-André-Avellin','Saint-Ambroise-de-Kildare','East Angus','Saint-Adolphe-d\'Howard','Saint-Prosper','Ormstown','Saint-Agapit',
    'Saint-Ambroise','Mistissini','Saint-Faustin--Lac-Carré','Saint-Pascal','Dunham','Havre-Saint-Pierre','Saint-Anselme','Trois-Pistoles',
    'Grande-Rivière','Malartic','Saint-Maurice','Ascot Corner','Fossambault-sur-le-Lac','Sainte-Anne-des-Lacs','Saint-Sulpice','Saint-Alphonse-de-Granby',
    'Sainte-Claire','Percé','Saint-Jean-Port-Joli','Saint-André-d\'Argenteuil','Saint-Côme--Linière','Forestville','Compton','Richmond',
    'Saint-Gabriel-de-Valcartier','Paspebiac','Saint-Thomas','Saint-Jean-Baptiste','Portneuf','Normandin','Saint-Alphonse-Rodriguez','Val-Morin',
    'Clermont','Saint-Christophe-d\'Arthabaska','Mont-Saint-Grégoire','Thurso','Saint-Gabriel','Saint-Liboire','Dégelis','Saint-Alexis-des-Monts',
    'Cap-Saint-Ignace','Saint-Anaclet-de-Lessard','Stoke','Cap Santé','Saint-David-de-Falardeau','Saint-Ferréol-les-Neiges','Senneterre','Saint-Mathieu-de-Beloeil',
    'Sainte-Marie-Madeleine','Sainte-Mélanie','Saint-Paul-d\'Abbotsford','Saint-Michel','Saint-Marc-des-Carrières','Stanstead','Sainte-Anne-de-Beaupré','Sainte-Luce',
    'Saint-Joseph-de-Sorel','Ferme-Neuve','Yamachiche','Adstock','Bonaventure','Pohénégamook','Saint-Isidore','Sainte-Marguerite-du-Lac-Masson',
    'Saint-Prime','Kuujjuaq','Grenville-sur-la-Rouge','Saint-Dominique','Macamic','Sainte-Anne-de-Sorel','Rougemont','Piedmont',
    'Lac-des-Écorces','Saint-Pamphile','Bedford','Weedon-Centre','Lacolle','Saint-Gabriel-de-Brandon','Huntingdon','Saint-Bruno',
    'Laurier-Station','Saint-Anicet','Cap-Chat','Notre-Dame-de-Lourdes','Ville-Marie','Wickham','Neuville','Maria',
    'Saint-Chrysostome','Saint-Damase','Disraeli','Saint-Alexandre','Hérbertville','Sainte-Thècle','Fermont','La Présentation',
    'Sainte-Catherine-de-Hatley','Saint-Basile','Saint-Raphaël','Saint-Martin','Causapscal','Brigham','Sainte-Victoire-de-Sorel','Port-Daniel--Gascons',
    'Labelle','Saint-Michel-des-Saints','Saint-Victor','Saint-Éphrem-de-Beauce','Léry','Témiscaming','Sainte-Geneviève-de-Berthier','Sainte-Madeleine',
    'Sainte-Croix','Valcourt','Saint-Mathieu','Waterville','Mansfield-et-Pontefract','Saint-Denis','Gore','Saint-Gédéon-de-Beauce',
    'Saint-Léonard-d\'Aston','Fort-Coulonge','Albanel','Pessamit','Maskinongé','Saint-Charles-de-Bellechasse','Hatley','East Broughton',
    'Saint-Polycarpe','Deschambault','Wendake','Saint-Côme','Waskaganish','Lebel-sur-Quévillon','Pierreville','Saint-Gilles',
    'Saint-Bernard','Sainte-Cécile-de-Milton','Saint-Roch-de-Richelieu','Saint-Nazaire','Saint-Elzéar','Hinchinbrooke','Saint-François-Xavier-de-Brompton','Papineauville',
    'Saint-Ignace-de-Loyola','Sainte-Anne-de-Sabrevois','Sainte-Anne-de-la-Pérade','Saint-Damien-de-Buckland','Saint-Ferdinand','Saint-Fulgence','Manouane','Saint-Gervais',
    'Saint-Alexandre-de-Kamouraska','Saint-Marc-sur-Richelieu','Mandeville','Caplan','Saint-Damien','Lac-Nominingue','Obedjiwan','Saint-Gédéon',
    'Kingsey Falls','L\'Ascension-de-Notre-Seigneur','Barraute','Saint-Liguori','Saint-Patrice-de-Sherrington','Saint-Esprit','Mashteuiatsh','Saint-François-du-Lac',
    'Vallée-Jonction','Saint-Fabien','Lac-Supérieur','Les Escoumins','Terrasse-Vaudreuil','Rivière-Beaudette','Saint-Barthélemy','Austin',
    'Saint-Paul-de-l\'Île-aux-Noix','Saint-Cyprien-de-Napierville','Déléage','Potton','Sainte-Béatrix','Saint-Georges-de-Cacouna','Sainte-Justine','Saint-Valérien-de-Milton',
    'Saint-Cuthbert','Saint-Blaise-sur-Richelieu','Saint-Joseph-de-Coleraine','Pointe-Lebel','Grenville','Saint-Michel-de-Bellechasse','Sainte-Angèle-de-Monnoir','Champlain',
    'Sacré-Coeur-Saguenay','Saint-Lucien','Saint-Robert','La Guadeloupe','Sutton','Saint-Placide','Povungnituk','Pointe-des-Cascades',
    'Chambord','Dudswell','Saint-Narcisse','Waswanipi','Inukjuak','Saint-Zacharie','Hemmingford','Saint-Pierre-de-l\'Île-d\'Orléans',
    'Saint-Clet','Saint-Ours','Sainte-Anne-de-la-Pocatière','Notre-Dame-du-Bon-Conseil','Sainte-Clotilde','Nouvelle','Yamaska','Saint-Antoine-de-Tilly',
    'Saint-Élie-de-Caxton','Price','Saint-Jacques-le-Mineur','Val-Joli','Saint-Antoine-sur-Richelieu','Saint-Pacôme','Saint-Stanislas-de-Kostka','Frontenac',
    'Sainte-Émélie-de-l\'Énergie','Saint-Charles-sur-Richelieu','Sainte-Hélène-de-Bagot','Franklin Centre','Mille-Isles','Lyster','Sainte-Clotilde-de-Horton','Saint-Benoît-Labre',
    'Maliotenam','Chapais','Saint-Honoré-de-Shenley','Cleveland','Messines','Saint-Laurent-de-l\'Île-d\'Orléans','Saint-Jean-de-Dieu','Larouche',
    'Saint-François-de-la-Rivière-du-Sud','Eeyou Istchee Baie-James','Shawville','Lambton','Saint-Flavien','Sainte-Marcelline-de-Kildare','Rivière-Blanche','Saint-Félix-de-Kingsey',
    'Sainte-Élisabeth','Uashat','Saint-Bernard-de-Lacolle','Saint-Guillaume','Venise-en-Québec','Saint-Paulin','Saint-Albert','Matagami',
    'Amherst','Notre-Dame-du-Laus','Saint-Tite-des-Caps','Saint-Casimir','Saint-Malachie','Salluit','Saint-Louis-de-Gonzague','Saint-Urbain',
    'Tring-Jonction','Saint-Joachim','Saint-Théodore-d\'Acton','L’ Îsle-Verte','Palmarolle','Saint-Odilon-de-Cranbourne','La Doré','Lac-au-Saumon',
    'Wotton','Wemindji','Pointe-aux-Outardes','Rivière-Héva','Scott','Godmanchester','Saint-Simon','Tingwick',
    'Saint-Aubert','Saint-Mathieu-du-Parc','Saint-Ubalde','Berthier-sur-Mer','Frampton','Chute-aux-Outardes','New Carlisle','Saint-Majorique-de-Grantham',
    'Wentworth-Nord','Sainte-Ursule','Nantes','Lac-aux-Sables','Vaudreuil-sur-le-Lac','Amulet','L’Avenir','Pointe-à-la-Croix',
    'Hérouxville','L\'Isle-aux-Allumettes','Sainte-Brigide-d\'Iberville','Les Éboulements','Sainte-Barbe','Saint-Louis-du-Ha! Ha!','Ragueneau','Saint-Édouard',
    'Rivière-Bleue','Noyan','Notre-Dame-du-Portage','Saint-Hugues','Sainte-Anne-du-Sault','La Conception','L\'Isle-aux-Coudres','Sainte-Lucie-des-Laurentides',
    'Saint-Alexis','Roxton Falls','Clarendon','Saint-Ludger','Racine','Saint-Zénon','Saint-Armand','Saint-Édouard-de-Lotbinière',
    'Saint-Arsène','Listuguj','Saint-Hubert-de-Rivière-du-Loup','Saint-Jude','La Minerve','Trécesson','Notre-Dame-des-Pins','Saint-Alban',
    'Saint-Pierre-les-Becquets','Labrecque','Sainte-Hénédine','L\'Anse-Saint-Jean','Akwesasne','Saint-Valère','Saint-Norbert-d\'Arthabaska','Saint-Hilarion',
    'Saint-Modeste','Saint-Siméon','Saint-Barnabé','Bury','Lac-Bouchette','Saint-Lazare-de-Bellechasse','Saint-Michel-du-Squatec','Saint-Joachim-de-Shefford',
    'Grand-Remous','Saint-Gabriel-de-Rimouski','Sainte-Marie-Salomé','Saint-Cyprien','Très-Saint-Sacrement','Saints-Anges','Saint-Urbain-Premier','Sainte-Agathe-de-Lotbinière',
    'Grande-Vallée','Mont-Carmel','Saint-Eugène','Notre-Dame-des-Neiges','Saint-Léon-de-Standon','Sayabec','Sainte-Sabine','Saint-Maxime-du-Mont-Louis',
    'Blanc-Sablon','Ayer’s Cliff','Les Méchins','Sainte-Marguerite','Saint-Claude','Sainte-Jeanne-d\'Arc','Sainte-Félicité','Girardville',
    'Saint-Bruno-de-Guigues','Upton','Saint-Narcisse-de-Beaurivage','Plaisance','Roxton-Sud','Saint-Frédéric','Saint-Narcisse-de-Rimouski','Saint-Patrice-de-Beaurivage',
    'Sainte-Marthe','Notre-Dame-du-Nord','Saint-Aimé-des-Lacs','Lac-Drolet','Coleraine','Saint-Bonaventure','Saint-Wenceslas','Sainte-Geneviève-de-Batiscan',
    'Saint-Justin','Saint-Norbert','Riviere-Ouelle','Stukely-Sud','Saint-Georges-de-Clarenceville','Sainte-Thérèse-de-Gaspé','Sainte-Pétronille','Desbiens',
    'La Macaza','Saint-Vallier','Bristol','Saint-Sylvestre','Saint-Stanislas','Longue-Rive','Saint-Léonard-de-Portneuf','Brébeuf',
    'Baie-du-Febvre','Durham-Sud','Melbourne','Hébertville','Lorrainville','Saint-René-de-Matane','Eastman','Wemotaci',
    'Cookshire','Laurierville','Ripon','Henryville','Gracefield','Yamaska-Est','Frelighsburg',
  ],
  'British Columbia': [
    'Vancouver','Surrey','Victoria','Burnaby','Richmond','Kelowna','Abbotsford','Coquitlam',
    'Saanich','White Rock','Delta','Nanaimo','Kamloops','Chilliwack','Maple Ridge','New Westminster',
    'Prince George','Port Coquitlam','North Vancouver','Vernon','Courtenay','Langford Station','West Vancouver','Mission',
    'Campbell River','Penticton','East Kelowna','Port Moody','North Cowichan','Langley','Parksville','Duncan',
    'Squamish','Port Alberni','Fort St. John','Cranbrook','Salmon Arm','Pitt Meadows','Colwood','Oak Bay',
    'Esquimalt','Central Saanich','Lake Country','Sooke','Comox','Terrace','Powell River','Trail',
    'Dawson Creek','Sidney','Prince Rupert','North Saanich','Quesnel','Williams Lake','Whistler','Summerland',
    'View Royal','Nelson','Ladysmith','Coldstream','Sechelt','Castlegar','Gibsons','Qualicum Beach',
    'Kitimat','Kimberley','Merritt','Kent','Hope','Peachland','Oliver','Fernie',
    'Creston','Northern Rockies','Smithers','Armstrong','Spallumcheen','Osoyoos','Metchosin','Westbank',
    'Cumberland','Vanderhoof','Bowen Island','Grand Forks','Port Hardy','Sparwood','Rossland','Mackenzie',
    'Golden','Fruitvale','Invermere','Ellison','Lake Cowichan','Cedar','Enderby','Houston',
    'Pemberton','Errington','Princeton','Cowichan Bay','Royston','Elkford','Highlands','Sicamous',
    'Chase','Tumbler Ridge','Anmore','Clearwater','Lillooet','Logan Lake','Port McNeill','Tofino',
    'Burns Lake','Saltair','Lumby','One Hundred Mile House','Ucluelet','Chetwynd','Harrison Hot Springs','Nisga\'a',
    'Lakeview','Keremeos','Warfield','Popkum','Coombs','Naramata','Nakusp','Fort St. James',
    'Hilliers','Ashcroft','Grindrod','Windermere','Gold River','Dunsmuir','Barrière','Lions Bay',
    'Telkwa','Ootischenia','Taylor','Sorrento','Youbou','Kaleden','Salmo','Valemount',
    'Hudson Hope',
  ],
  'Alberta': [
    'Calgary','Edmonton','Red Deer','Lethbridge','Airdrie','Wood Buffalo','St. Albert','Grande Prairie',
    'Medicine Hat','Spruce Grove','Leduc','Cochrane','Okotoks','Fort Saskatchewan','Chestermere','Beaumont',
    'Lloydminster','Camrose','Stony Plain','Sylvan Lake','Canmore','Cold Lake','Brooks','Strathmore',
    'High River','Lacombe','Wetaskiwin','Morinville','Blackfalds','Hinton','Whitecourt','Olds',
    'Taber','Coaldale','Edson','Banff','Drumheller','Innisfail','Drayton Valley','Ponoka',
    'Peace River','Slave Lake','Rocky Mountain House','Devon','Wainwright','Bonnyville','Stettler','St. Paul',
    'Vegreville','Crowsnest Pass','Redcliff','Didsbury','Westlock','Jasper','Barrhead','Vermilion',
    'Carstairs','Raymond','Claresholm','Pincher Creek','Crossfield','Cardston','Grande Cache','High Level',
    'Penhold','Gibbons','Three Hills','Fort Macleod','Athabasca','Coalhurst','Sundre','Grimshaw',
    'Black Diamond','Sexsmith','Rimbey','High Prairie','Turner Valley','Hanna','Beaverlodge','Magrath',
    'Calmar','Nanton','Redwater','Tofield','Provost','Bow Island','Fox Creek','Millet',
    'Picture Butte','Vulcan','Valleyview','Lamont','Wabasca','Springbrook','Wembley','Bon Accord',
    'Elk Point','Nobleford','Two Hills','Bruederheim','Mayerthorpe','Swan Hills','Vauxhall','Bowden',
    'Legal','Bassano','Manning','Irricana','Eckville','Alberta Beach','Duchess','Viking',
    'Bentley','Trochu','Falher','Onoway','Oyen',
  ],
  'Manitoba': [
    'Winnipeg','Brandon','Steinbach','Springfield','Hanover','Winkler','Portage La Prairie','Thompson',
    'Taché','St. Andrews','St. Clements','Selkirk','Morden','East St. Paul','Stanley','Macdonald',
    'Dauphin','Rockwood','Ritchot','The Pas','West St. Paul','La Broquerie','Niverville','Brokenhead',
    'Stonewall','Ste. Anne','Flin Flon (Part)','Neepawa','Cornwallis','Headingley','Altona','Swan River',
    'De Salaberry','Lorette','Killarney - Turtle Mountain','Woodlands','Bifrost-Riverton','Cartier','Hillsburg-Roblin-Shell River','WestLake-Gladstone',
    'Mitchell','Beauséjour','Lac du Bonnet','Virden','Morris','Carman','North Cypress-Langford','Minnedosa',
    'Dufferin','Kelsey','Gimli','West Interlake','Prairie View','Deloraine-Winchester','Oakland-Wawanesa','Brenda-Waskada',
    'Russell-Binscarth','Ellice-Archie','Souris-Glenwood','Riverdale','Pembina','Wallace-Woodworth','Lorne','Yellowhead',
    'Swan Valley West','Grey','Gilbert Plains','Norfolk-Treherne','Emerson-Franklin','Sifton','Grassland','Louise',
    'Ste. Rose','Cartwright-Roblin','Mossey River','Lakeshore','Riding Mountain West','Clanwilliam-Erickson','Glenboro-South Cypress','North Norfolk',
    'Reinland','Minitonas-Bowsman','Carberry','Armstrong','Grunthal','Piney','Blumenort','Fisher',
    'Wasagamack','Whitehead','Rosedale','Stuartburn','Oakview','Harrison Park','Boissevain','Pinawa',
    'Pipestone','Prairie Lakes','St. François Xavier','Grahamdale','Reynolds','St. Laurent','Landmark','Powerview-Pine Falls',
    'St-Pierre-Jolys','Arborg','Elton','Rosser','Montcalm','Coldwell','Alonsa','Teulon',
    'Minto-Odanah','Glenella-Lansdowne','Two Borders','Winnipeg Beach','Victoria','Roland','Melita','Argyle',
    'Hamiota','Gillam','Grand View','McCreary','Rossburn','Ethelbert',
  ],
  'Saskatchewan': [
    'Saskatoon','Regina','Prince Albert','Moose Jaw','Lloydminster','Swift Current','Yorkton','North Battleford',
    'Warman','Weyburn','Estevan','Martensville','Corman Park No. 344','Melfort','Humboldt','Meadow Lake',
    'La Ronge','Flin Flon','White City','Kindersley','Melville','Edenwold No. 158','Nipawin','Battleford',
    'Prince Albert No. 461','Buckland No. 491','Tisdale','La Loche','Vanscoy No. 345','Pelican Narrows','Pilot Butte','Unity',
    'Meadow Lake No. 588','Moosomin','Esterhazy','Rosetown','Assiniboia','Rosthern No. 403','Outlook','Canora',
    'Biggar','Maple Creek','Dundurn No. 314','Britannia No. 502','Rama','Swift Current No. 137','Blucher','Lumsden No. 189',
    'Fort Qu’Appelle','Indian Head','Watrous','Orkney No. 244','Kamsack','Lumsden','Regina Beach','Shaunavon',
    'Wynyard','Dalmeny','Balgonie','Rosthern','Shellbrook No. 493','Carlyle','Langham','Hudson Bay',
    'Frenchman Butte','Wilton No. 472','Torch River No. 488','Shellbrook','Macklin','Creighton','Laird No. 404','Canwood No. 494',
    'Spiritwood No. 496','Oxbow','Wadena','Wilkie','Ile-à-la-Crosse','Estevan No. 5','Lanigan','South Qu\'Appelle No. 157',
    'Mervin No. 499','Osler','Beaver River','Moose Jaw No. 161','Langenburg','Maidstone','Kipling','Carnduff',
    'Foam Lake','Hudson Bay No. 394','Waldheim','Buffalo Narrows','Air Ronge','Weyburn No. 67','Grenfell','St. Louis No. 431',
    'Pinehouse','Preeceville','Maple Creek No. 111','Birch Hills','Kerrobert','Eston','Kindersley No. 290','Davidson',
    'Battle River No. 438','Delisle','Longlaketon No. 219','Nipawin No. 487','Duck Lake No. 463','Gravelbourg','Lajord No. 128',
  ],
  'Nova Scotia': [
    'Halifax','Cape Breton','Truro','New Glasgow','Inverness','Kentville','Chester','Queens',
    'Amherst','Bridgewater','Church Point','Argyle','Yarmouth','Barrington','Antigonish','Windsor',
    'Wolfville','Stellarton','Westville','Port Hawkesbury','Pictou','Berwick','Trenton','Lunenburg',
    'Digby','Middleton','Shelburne','Lantz','Falmouth','Stewiacke','Parrsboro','Oxford',
    'Centreville','Wedgeport','Mahone Bay',
  ],
  'New Brunswick': [
    'Moncton','Saint John','Fredericton','Dieppe','Quispamsis','Riverview','Miramichi','Edmundston',
    'Bathurst','Oromocto','Campbellton','Shediac','Beaubassin East / Beaubassin-est','Douglas','Sussex','Tracadie',
    'Sackville','Grand Falls','Woodstock','Burton','Saint Marys','Memramcook','Grand Bay-Westfield','Shippagan',
    'Coverdale','Hanwell','Saint Stephen','Hampton','Beresford','Caraquet','New Maryland','Dundas',
    'Simonds','Alnwick','Studholm','Bright','Kingston','Dalhousie','Wellington','Kingsclear',
    'Wakefield','Cocagne','Shippegan','Lincoln','Cap Pele','Salisbury','Buctouche','Grand Manan',
    'Saint George','Paquetville','Minto','Upper Miramichi','Hardwicke','Saint-Quentin','Pennfield Ridge','Northesk',
    'Kent','Westfield Beach','Allardville','Saint-Charles','Saint Mary','Petit Rocher','Eel River Crossing','Manners Sutton',
    'Richibucto','Saint-Louis','Saint Andrews','Maugerville','Brighton','Saint-Antoine','Northampton','Wicklow',
    'Neguac','Balmoral','Southesk','Saint-Jacques','Florenceville','Perth','Saint-Joseph','Belledune',
    'Nauwigewauk','Glenelg','Saint David','Springfield','St. George','Gordon','Southampton','Denmark',
    'Sussex Corner','Petitcodiac','Bas Caraquet','Upham','Cardwell','Hillsborough','Weldford','Norton',
    'Charlo','Richmond','Saint-Léonard','Lamèque','Musquash','Queensbury','New Bandon','Peel',
    'Saint James','Saint Martins','Rogersville','McAdam','Newcastle','Bertrand','Saint-André','Greenwich',
    'Chipman','Noonan','Atholville','Durham','Havelock','Botsford','Plaster Rock','Wilmot',
    'Kedgwick','Dorchester','Rothesay',
  ],
  'Newfoundland and Labrador': [
    'St. John\'s','Conception Bay South','Paradise','Mount Pearl Park','Corner Brook','Grand Falls','Gander','Labrador City',
    'Portugal Cove-St. Philip\'s','Happy Valley','Torbay','Stephenville','Bay Roberts','Clarenville','Carbonear','Marystown',
    'Deer Lake','Goulds','Channel-Port aux Basques','Pasadena','Placentia','Bonavista','Lewisporte','Bishops Falls',
    'Harbour Grace','Springdale','Botwood','Spaniards Bay','Holyrood','Logy Bay-Middle Cove-Outer Cove','Burin','Grand Bank',
    'St. Anthony','Fogo Island','Twillingate','New-Wes-Valley','Wabana','Glovertown','Pouch Cove','Kippens',
    'Wabush','Trinity Bay North','Victoria','Flat Rock','Stephenville Crossing','Witless Bay','Harbour Breton','Massey Drive',
    'Bay Bulls','Upper Island Cove','Clarkes Beach','Gambo','Humbermouth','Baie Verte','Burgeo','Irishtown-Summerside',
    'St. George\'s','St. Lawrence','St. Alban\'s','Centreville-Wareham-Trinity','Nain','Harbour Main-Chapel\'s Cove-Lakeview','Fortune','Dildo',
  ],
  'Prince Edward Island': [
    'Charlottetown','Summerside','Stratford','Cornwall','Montague','Kensington','Miltonvale Park','Alberton',
    'Souris','Malpeque',
  ],
  'Northwest Territories': [
    'Yellowknife','Hay River','Inuvik','Fort Smith','Behchokò','Fort Simpson',
  ],
  'Nunavut': [
    'Iqaluit','Rankin Inlet','Arviat','Baker Lake','Cambridge Bay','Igloolik','Pond Inlet','Pangnirtung',
    'Cape Dorset','Gjoa Haven','Repulse Bay','Clyde River','Taloyoak','Kugluktuk',
  ],
  'Yukon': [
    'Whitehorse','Dawson',
  ],
}

function getAllCities() {
  const all = []
  for (const [province, cities] of Object.entries(CITIES_BY_PROVINCE)) {
    for (const city of cities) all.push({ city, province })
  }
  return all.sort((a, b) => a.city.localeCompare(b.city))
}

const inputStyle = {
  width: '100%', padding: '12px 16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, color: '#ffffff', fontSize: 14,
  outline: 'none', fontFamily: "'Barlow', sans-serif", fontWeight: 300,
  transition: 'border-color 0.15s, background 0.15s',
  cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none',
}

const selectWrapper = { position: 'relative', width: '100%' }
const chevron = {
  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
  pointerEvents: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12,
}

const btn = (valid, loading) => ({
  borderRadius: 40, border: 'none',
  cursor: valid && !loading ? 'pointer' : 'not-allowed',
  fontFamily: "'Barlow', sans-serif", fontWeight: 600,
  background: valid && !loading ? '#ffffff' : 'rgba(255,255,255,0.06)',
  color: valid && !loading ? '#000' : 'rgba(255,255,255,0.3)',
  transition: 'transform 0.15s, background 0.15s',
})

const hoverBtn = e => { e.currentTarget.style.transform = 'scale(1.02)' }
const unhoverBtn = e => { e.currentTarget.style.transform = '' }

export default function AddressSearch({ onSearch, loading, compact }) {
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedProvince, setSelectedProvince] = useState('')
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const allCities = getAllCities()
  const filtered = query.length > 0
    ? allCities.filter(c =>
        c.city.toLowerCase().startsWith(query.toLowerCase()) ||
        (selectedProvince && c.province === selectedProvince && c.city.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 10)
    : (selectedProvince
        ? (CITIES_BY_PROVINCE[selectedProvince] || []).map(c => ({ city: c, province: selectedProvince })).slice(0, 10)
        : allCities.slice(0, 10))

  const handleCitySelect = (city, province) => {
    setSelectedCity(city)
    setSelectedProvince(province)
    setQuery(city)
    setShowDropdown(false)
  }

  const submit = (e) => {
    e?.preventDefault()
    const cityName = selectedCity || query.trim()
    if (!cityName) return
    onSearch({ street: '', city: cityName, state: selectedProvince, country: 'Canada', knownFacts: {} })
  }

  const valid = selectedCity || query.trim()

  const focusStyle = e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; e.target.style.background = 'rgba(255,255,255,0.08)' }
  const blurStyle  = e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)';  e.target.style.background = 'rgba(255,255,255,0.05)' }

  const canadaFlag = (
    <span style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'rgba(255,100,100,0.8)', fontFamily: "'Barlow',sans-serif", fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      🍁 Canada only
    </span>
  )

  const cityInput = (
    <div style={{ position: 'relative' }}>
      <input
        id="dwelling-city-search"
        name="city"
        type="text"
        role="combobox"
        aria-label="Search Canadian city"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls="city-listbox"
        value={query}
        onChange={e => { setQuery(e.target.value); setSelectedCity(''); setShowDropdown(true) }}
        onFocus={e => { focusStyle(e); setShowDropdown(true) }}
        onBlur={e => { blurStyle(e); setTimeout(() => setShowDropdown(false), 150) }}
        placeholder="Search city — e.g. Ottawa, Vancouver, Calgary"
        disabled={loading}
        autoComplete="off"
        style={{ ...inputStyle, cursor: 'text', paddingRight: 36 }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (filtered[0]) handleCitySelect(filtered[0].city, filtered[0].province)
            else submit()
          }
        }}
      />
      <span style={chevron} aria-hidden="true">▼</span>
      {showDropdown && filtered.length > 0 && (
        <ul
          id="city-listbox"
          role="listbox"
          aria-label="Canadian cities"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
            background: 'rgba(15,15,20,0.98)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, marginTop: 4, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            listStyle: 'none', padding: 0, margin: '4px 0 0 0',
            maxHeight: 320, overflowY: 'auto',
          }}
        >
          {filtered.map(({ city, province }) => (
            <li
              key={`${city}-${province}`}
              role="option"
              aria-selected={selectedCity === city}
              onMouseDown={() => handleCitySelect(city, province)}
              style={{
                padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.1s',
                fontFamily: "'Barlow',sans-serif",
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 400 }}>{city}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 300 }}>{province}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  const provinceSelect = (
    <div style={selectWrapper}>
      <select
        id="dwelling-province-select"
        name="province"
        aria-label="Select province (optional)"
        value={selectedProvince}
        onChange={e => { setSelectedProvince(e.target.value); setSelectedCity(''); setQuery(''); setShowDropdown(true) }}
        disabled={loading}
        style={{ ...inputStyle }}
        onFocus={focusStyle}
        onBlur={blurStyle}
      >
        {PROVINCES.map(p => (
          <option key={p.value} value={p.value} style={{ background: '#111', color: '#fff' }}>{p.label}</option>
        ))}
      </select>
      <span style={chevron} aria-hidden="true">▼</span>
    </div>
  )

  if (compact) return (
    <form onSubmit={submit} role="search" aria-label="Search Canadian city">
      <div className="liquid-glass" style={{ borderRadius: 16, padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 2, minWidth: 160, position: 'relative' }}>
          {cityInput}
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          {provinceSelect}
        </div>
        <button type="submit" disabled={loading || !valid}
          style={{ ...btn(valid, loading), padding: '10px 20px', fontSize: 13, whiteSpace: 'nowrap' }}
          aria-label={loading ? 'Analyzing...' : 'Search city'}
          onMouseEnter={hoverBtn} onMouseLeave={unhoverBtn}>
          {loading ? 'Analyzing...' : 'Search →'}
        </button>
      </div>
    </form>
  )

  return (
    <form onSubmit={submit} role="search" aria-label="Search Canadian city for analysis">
      <div className="liquid-glass-strong" style={{ borderRadius: 20, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <label
            htmlFor="dwelling-city-search"
            style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Barlow',sans-serif" }}
          >
            City *
          </label>
          {canadaFlag}
        </div>
        <div style={{ marginBottom: 12 }}>
          {cityInput}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="dwelling-province-select"
            style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'Barlow',sans-serif" }}
          >
            Province <span style={{ opacity: 0.5 }}>(optional)</span>
          </label>
          {provinceSelect}
        </div>
        <button
          type="submit"
          disabled={loading || !valid}
          aria-label={loading ? 'Analyzing city data' : 'Get free city intelligence report'}
          style={{ ...btn(valid, loading), width: '100%', padding: '14px', fontSize: 15 }}
          onMouseEnter={hoverBtn} onMouseLeave={unhoverBtn}
        >
          {loading ? '⟳ Analyzing...' : '→ Get Report'}
        </button>
      </div>
    </form>
  )
}
