$(document).ready(function() {

    // Clés API
    L.mapquest.key = "zRJ8z0faRwpJjc6nJC6dSe9MuG7oM0BK";
    const MapQuestKey = "zRJ8z0faRwpJjc6nJC6dSe9MuG7oM0BK";
    const apifyKey = "49c96f47cf684b5fadba35f7993e862b";
    Chart.register('chartjs-plugin-annotation');
    // Liste de marqueurs et des altitudes
    var Markers = [];
    var mapMarkers = [];
    var Altitudes = [];
    var Distances = [];
    // default map layer
    let map = L.mapquest.map('map', {
        layers: L.mapquest.tileLayer('map'),
        center: [49.894067, 2.295753],
        zoom: 12
    });
    map.on('click', mapClick);

    // Récupèration des inputs en cas de F5 TODO: Gérer les inputs rajoutés
    if ($('#point1City')[0].value.length != 0 && $('#point2City')[0].value.length != 0) {
        submitForm();
    }

    // Ajout des points et création de la route
    function addPoint(vals) {
        // Si on a deux valeurs passées
        if(vals.length >= 2)
        {
            runDirection(vals);
        }
        map.on('click', mapClick);
    }

    function dragMark(event) {
        event.preventDefault();
        console.log("test");
    }
    // Création de la map et la route
    function runDirection(vals) {
        map = L.mapquest.map('map', {
            layers: L.mapquest.tileLayer('map'),
            center: [49.894067, 2.295753],
            zoom: 12
        });

        var directions = L.mapquest.directions();
        directions.setLayerOptions({
            startMarker: {
             draggable: false
            },
            endMarker: {
              draggable: false
            },
            waypointMarker : {
                draggable: false
            },
            routeRibbon: {
              draggable: false
            }
        });
        // Dans le cas du formulaire envoyé, le tableau de marker n'est pas encore set
        if (Markers.length == 0) {
            directions.route({
                locations: vals,
            });
        } else {
            directions.route({
                locations: Markers
            });
        }

        // On cache le graphique et on affiche le bouton de génération
        removeGraph();
        $('.graphGen').show();
    }


    // function that runs when form submitted
    function submitForm(event) {
        if (event) {
            event.preventDefault();
        }
        var vals = [];
        Markers = [];
        Distances = [];
        // Get form datas (index représente le numéro du point (de 1 au dernier))
        for (let index = 1; index <= $('.divLocation').length; index++) {
            var val = $(`#point${index}City`)[0].value;
            if (val.length == 0 || val == "Point Personnalisé") {
                lat = $(`#point${index}Lat`)[0].value;
                long = $(`#point${index}Long`)[0].value;
                val = `${lat},${long}`;
                if (val.length > 2) {
                    Markers.push(val);
                    getAltitude(lat, long);
                    if ($(`#point${index}City`)[0].value != "Point Personnalisé") {
                        L.mapquest.geocoding().reverse({lat:lat, lng:long}, 10, function(error, result) {
                            $(`#point${index}City`)[0].value = result.results[0].locations[0].street ? result.results[0].locations[0].street : "Point Personnalisé";
                        });
                    }
                } else {
                    if ($('.divLocation').length == 2) {
                        Swal.fire({
                            title: "Pas assez de points",
                            html: "Il n'y a pas assez de points renseignés pour générer un trajet",
                            timer: 2000,
                        }); 
                        return false;
                    } else {
                        val = null;
                        index2 = index;
                        // Suppression des points vides lors de génération de trajet
                        if (index2 < $('.divLocation').length) {
                            do {
                                $(`#point${index2}Lat`)[0].value =  $(`#point${index2 + 1}Lat`)[0].value;
                                $(`#point${index2}Long`)[0].value =  $(`#point${index2 + 1}Long`)[0].value;
                                $(`#point${index2}City`)[0].value =  $(`#point${index2 + 1}City`)[0].value;
                                if ($(`#point${index2}City`)[0].value == "Point Personnalisé") {
                                    $(`#point${index2}City`)[0].disabled = true;
                                } else {
                                    $(`#point${index2}City`)[0].disabled = false;
                                }
                                $(`#point${index2}City`)[0].classList.replace("inputCity1", "inputCity2");
                                if($(`#point${index2}City`)[0].style.display != "none") {
                                    $(`#point${index2}Trash`)[0].style.display = "";
                                }
                                index2++;
                            } while($('.divLocation').length > index2)
                        }
                        index2 --;
                        $('.divLocation')[index2].remove();
                        $('.waypoint').last().remove();
                        $('.waypoint').last()[0].id = `${$('.waypoint').last()[0].id.split('-')[0]}-`;
                        if ($('.divLocation').length < 5 && $('.waypoint')[0].style.display == "none") {
                            $('.waypoint').show();
                        }
                        $(`#point${index2}City`)[0].placeholder = "Point d'arrivée";
                        index --;
                    }
                }
            } else {
                L.mapquest.geocoding().geocode(val, function(error, result) {
                    lat = result.results[0].locations[0].latLng.lat;
                    long = result.results[0].locations[0].latLng.lng;
                    val = `${lat},${long}`;
                    $(`#point${index}Lat`)[0].value = `${val.split(',')[0].trim()}`;
                    $(`#point${index}Long`)[0].value = `${val.split(',')[1].trim()}`;
                    Markers.push(val);
                    getAltitude(lat, long);
                });
            }
            if (val) {
                vals.push(val);
                if (index == 1) {
                    start = val;
                } else if (index == $('.divLocation').length) {
                    end = val;
                }
            }
        }

        // delete current map layer
        map.remove();
        addPoint(vals);
    }

    function mapClick(e) {
        if (Markers.length < 5) {
            lat = e.latlng.lat;
            lon = e.latlng.lng;

            removeGraph();
            // Recherche d'un index de point n'ayant pas de data
            var trou = searchHole();
            if (trou != -1) {
                $(`#point${trou}Lat`)[0].value = `${lat}`;
                $(`#point${trou}Long`)[0].value = `${lon}`;
                $(`#point${trou}City`)[0].value = "Point Personnalisé";
                $(`#point${trou}City`)[0].disabled = true;
                $(`#point${trou}City`)[0].classList.replace("inputCity1", "inputCity2");
                if($(`#point${trou}City`)[0].style.display != "none") {
                    $(`#point${trou}Trash`)[0].style.display = "";
                }
                Markers.push(`${lat},${lon}`);
                if (Markers.length == $('.divLocation').length) {
                    map.remove();
                    addPoint(Markers);
                } else {
                    var newMarker = L.marker([lat, lon], {draggable: true}).addTo(map);
                    newMarker.on('dragend', markerDragEnd);
                }
            } else {
                Markers.push(`${lat},${lon}`);
                map.remove();
                // getting form data
                start = $("#point1City")[0].value;
                end = $(`#point${Markers.length - 1}City`).value;
                if (start == null) {
                    start = `${$("#point1Lat")[0].value},${$("#point1Long")[0].value}`
                }
                if (end == null) {
                    end = `${$(`#point${Markers.length - 1}Lat`)[0].value},${$(`#point${Markers.length - 1}Long`)[0].value}`
                }
                // run directions function
                addPoint([start, end]);

                // Ajout d'une nouvelle div
                newEnd(lat, lon);
            }
            getAltitude(lat, lon);
            // On empêche la création de plus de 5 points  (pour l'instant)
            if ($('.divLocation').length == 5) {
                $('.waypoint').hide();
            }
        } else {
            Swal.fire({
                title: "Max points",
                html: "Le maximum de points est de 5",
                timer: 2000,
            });
        }
    }

    function markerDragEnd(event) {
        if (Markers.length == 1) {
            var position = event.target.getLatLng();
            $('#point1Lat')[0].value = position.lat;
            $('#point1Long')[0].value = position.lng;
            Markers[0] = `${position.lat},${position.lng}`;
        }
    }
    // Retourne le point où il n'y a pas de données dans les input
    function searchHole() {
        for (let index = 1; index <= $('.divLocation').length; index++) {
            if ($(`#point${index}City`)[0].value == "") {
                return index;
            }
        }
        return -1;
    }

    // Récupèration de l'altitude d'un point
    function getAltitude(lat, lon) {
        fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`)
        .then(response => response.json())
        .then(data => {
            Altitudes.push(data.elevation[0]);
        });
    }

    async function regenDistance() {
        Distances = [];
        Distances[0] = 0;
        for (let index = 1; index < Markers.length; index++) {
            const response = await fetch(`https://api.geoapify.com/v1/routing?waypoints=${Markers[index - 1]}|${Markers[index]}&mode=mountain_bike&apiKey=${apifyKey}`);
            var newDist = await response.json();
            Distances.push(Distances[index - 1] + newDist.features[0].properties.distance);
        }
    }

    // asign the form to form variable
    const form = document.getElementById('form');

    // call the submitForm() function when submitting the form
    form.addEventListener('submit', submitForm);

    // Ajout d'un nouveau point en fin de liste
    function newEnd(lat, lon, position) {
        var trash = 1;
        if (!position) {
            trash = 2;
            display = "";
            position = Markers.length;
        }
        var count = position;
        var newInput = `
        <button name="plus" class="input-more waypoint" id="${position-1}-${position}"><i class="fa-regular fa-square-plus fa-lg"></i> Ajouter un point</button>

        <div class="divLocation">
            <button name="point${count}Change" class="inputChange" onclick="changeInput('point${count}')" id="point${count}Change"><i class="fa-solid fa-building"></i></button>
            <button name="point${count}Delete" title="Supprimer le point" class="delete" id="point${count}Delete"><i class="fa-solid fa-trash-can"></i></button>
            <button name="point${count}Trash" title="Supprimer le contenu" class="trash" onclick="TrashInput('point${count}')" id="point${count}Trash" style="display:none"><i class="fa-solid  fa-broom"></i></button>
            <input type="text" name="point${count}City" class="inputCity${trash}" id="point${count}City" placeholder="Point d'arrivée"/>
            <input type="text" name="point${count}Lat" class="inputCoorLat1" style="display:none;" id="point${count}Lat" placeholder="Latitude"/>
            <input type="text" name="point${count}Long" class="inputCoorLong1" style="display:none;" id="point${count}Long" placeholder="Longitude"/>
        </div>
        
        <button name="plus" class="input-more waypoint" id="${position}-"><i class="fa-regular fa-square-plus fa-lg"></i> Ajouter un point</button>`;
        
        $('.waypoint').last().remove();

        $(newInput).insertAfter($('.divLocation').last());
        
        $(`#point${count}Trash`).on('click', removeMarker);
        $(`#${position-1}-${position}`).on('click', waypointClick);
        $('input[type="text"').on('input', showTrash);
        $(`#point${count}Delete`).on('click', deleteMarker);
        $(`#${position}-`).on('click', waypointClick);

        if (lat && lon) {
            $(`#point${Markers.length}Lat`)[0].value = `${lat}`;
            $(`#point${Markers.length}Long`)[0].value = `${lon}`;
            $(`#point${Markers.length}City`)[0].value = "Point Personnalisé";
            $(`#point${count}City`)[0].disabled = true;
            $(`#point${count}Trash`)[0].style.display = "";
        }
        $(`#point${count - 1}City`)[0].placeholder = "Point de passage";
    }

    // Décalage de toutes les valeurs vers le bas pour ajouter nouveau départ
    function newStart() {
        newEnd(null, null, $('.divLocation').length + 1);
        var lat, lon, city, latSave, lonSave, citySave;
        latSave = $(`#point1Lat`)[0].value;
        lonSave = $(`#point1Long`)[0].value;
        citySave = $(`#point1City`)[0].value;
        $(`#point1Lat`)[0].value = "";
        $(`#point1Long`)[0].value = "";
        $(`#point1City`)[0].value = "";
        $(`#point1City`)[0].disabled = false;
        $(`#point1Trash`).hide();
        $(`#point1City`)[0].classList.replace("inputCity2", "inputCity1");

        for (let index = 2; index <= $('.divLocation').length; index++) {
            lat = $(`#point${index}Lat`)[0].value;
            lon = $(`#point${index}Long`)[0].value;
            city = $(`#point${index}City`)[0].value;
            $(`#point${index}Lat`)[0].value = latSave;
            $(`#point${index}Long`)[0].value = lonSave;
            $(`#point${index}City`)[0].value = citySave;
            if (latSave != "" || lonSave != "" || citySave != "") {
                $(`#point${index}City`)[0].classList.replace("inputCity1", "inputCity2");
                $(`#point${index}Trash`).show();
                if (citySave == "Point Personnalisé") {
                    $(`#point${index}City`)[0].disabled = true;
                }
            }
            latSave = lat;
            lonSave = lon;
            citySave = city;
        }
    }

    // Ajout d'un nouveau point
    function newWayPoint(position) {
        // Ajout d'un point en fin de liste
        newEnd(null, null, $('.divLocation').length + 1);
        var lat, lon, city, latSave, lonSave, citySave;
        latSave = $(`#point${position[1]}Lat`)[0].value;
        lonSave = $(`#point${position[1]}Long`)[0].value;
        citySave = $(`#point${position[1]}City`)[0].value;
        $(`#point${position[1]}City`)[0].value = "Point de passage";
        $(`#point${position[1]}City`)[0].disabled = false;
        $(`#point${position[1]}City`)[0].classList.replace("inputCity2", "inputCity1");
        $(`#point${position[1]}Trash`).hide();
        $(`#point${position[1]}Lat`)[0].value = "";
        $(`#point${position[1]}Long`)[0].value = "";
        $(`#point${position[1]}City`)[0].value = "";

        // Décalage de tout les points à partir du + cliqué vers le bas
        index = parseInt(position[1]) + 1;
        do {
            lat = $(`#point${index}Lat`)[0].value;
            lon = $(`#point${index}Long`)[0].value;
            city = $(`#point${index}City`)[0].value;
            $(`#point${index}Lat`)[0].value = latSave;
            $(`#point${index}Long`)[0].value = lonSave;
            $(`#point${index}City`)[0].value = citySave;
            if (latSave != "" || lonSave != "" || citySave != "") {
                $(`#point${index}City`)[0].classList.replace("inputCity1", "inputCity2");
                $(`#point${index}Trash`).show();
                if (citySave == "Point Personnalisé") {
                    $(`#point${index}City`)[0].disabled = true;
                }
            }
            latSave = lat;
            lonSave = lon;
            citySave = city;
            index ++;
        } while (index <= $('.divLocation').length);
    }

    // Différents ajouts de points selon la position du + cliqué
    // Un plus a un id = -1 quand c'est le premier, nb- quand c'est le dernier, sinon il a nbpoint-nbpoint avec les nb selon celui d'avant et d'après
    $('.waypoint').on('click', waypointClick);
    function waypointClick(event) {
        event.preventDefault();
        // On récupère le point d'avant et d'après
        var position = this.id.split('-');
        // Ajout d'un nouveau départ (pas de point d'avant)
        if (position[0].length == 0) {
            newStart();
        // Ajout d'une nouvelle fin (pas de point d'après)
        } else if (position[1].length == 0) {
            newEnd(null, null, $('.divLocation').length + 1);
        // Ajout d'un point entre deux autres
        } else {
            newWayPoint(position);
        }
        // On empêche la création de plus de 5 points  (pour l'instant)
        if ($('.divLocation').length == 5) {
            $('.waypoint').hide();
        }
    }


    // Suppression d'un marqueur en cliquant sur la poubelle
    $('.trash').on('click', removeMarker);
    function removeMarker(event) {
        event.preventDefault();
        markerNum = this.name.split('point')[1][0] - 1;
        Markers.splice(markerNum, 1);
        markerNum ++;
        $(`#point${markerNum}City`)[0].value = "";
        $(`#point${markerNum}Lat`)[0].value = "";
        $(`#point${markerNum}Long`)[0].value = "";
        $(`#point${markerNum}City`)[0].classList.replace("inputCity2", "inputCity1");
        $(`#point${markerNum}Lat`)[0].classList.replace("inputCoorLat2", "inputCoorLat1");
        $(`#point${markerNum}Long`)[0].classList.replace("inputCoorLong2", "inputCoorLong1");
        $(`#point${markerNum}Trash`).hide();
        map.remove();
        map = L.mapquest.map('map', {
            layers: L.mapquest.tileLayer('map'),
            center: [49.894067, 2.295753],
            zoom: 12
        });
        map.on('click', mapClick);
        var last = $('.divLocation').length;
        if (Markers.length >= 2 && $(`point${last}City`) != "") {
            L.mapquest.directions().route({
                locations: Markers
            });
        } else {
            Markers.forEach(element => {
                var newMarker = L.marker([element.split(',')[0], element.split(',')[1]], {draggable: true}).addTo(map);
                newMarker.on('dragend', markerDragEnd);
            });
            $('.graphGen').hide();
        }
        removeGraph();
    }

    // Affichage de la poubelle sur un input
    $('input[type="text"]').on('keyup', showTrash);
    function showTrash(event) {
        event.preventDefault();
        var point = this.name.split('point')[1][0];
        $(`#point${point}City`)[0].classList.replace("inputCity1", "inputCity2");
        $(`#point${point}Lat`)[0].classList.replace("inputCoorLat1", "inputCoorLat2");
        $(`#point${point}Long`)[0].classList.replace("inputCoorLong1", "inputCoorLong2");
        $(`#point${point}Trash`).show();
        if ($(`#point${point}City`)[0].value == "" && $(`#point${point}Lat`)[0].value == "" && $(`#point${point}Long`)[0].value == "") {
            $(`#point${point}City`)[0].classList.replace("inputCity2", "inputCity1");
            $(`#point${point}Lat`)[0].classList.replace("inputCoorLat2", "inputCoorLat1");
            $(`#point${point}Long`)[0].classList.replace("inputCoorLong2", "inputCoorLong1");
            $(`#point${point}Trash`).hide(); 
        }
    }


    $('.delete').on('click', deleteMarker);
    function deleteMarker(event) {
        event.preventDefault();
        if ($('.divLocation').length == 2) {
            Swal.fire({
                title: "Impossible de supprimer",
                html: "Vous ne pouvez pas supprimer ce marqueur, il n'y en aura plus assez pour générer un itinéraire",
                timer: 2000,
            });
            return false;
        }
        var markerNum = this.name.split('point')[1][0] - 1;
        if ($(`#point${markerNum}City`)[0].value != "") {
            Markers.splice(markerNum, 1);
        }
        markerNum ++;
        if (markerNum < $('.divLocation').length) {
            do {
                $(`#point${markerNum}Lat`)[0].value =  $(`#point${markerNum + 1}Lat`)[0].value;
                $(`#point${markerNum}Long`)[0].value =  $(`#point${markerNum + 1}Long`)[0].value;
                $(`#point${markerNum}City`)[0].value =  $(`#point${markerNum + 1}City`)[0].value;
                if ($(`#point${markerNum}City`)[0].value == "Point Personnalisé") {
                    $(`#point${markerNum}City`)[0].disabled = true;
                } else {
                    $(`#point${markerNum}City`)[0].disabled = false;
                }
                if ((`#point${markerNum}City`)[0].value != "" || $(`#point${markerNum}Long`)[0].value != "" || $(`#point${markerNum}Lat`)[0].value != "") {
                    $(`#point${markerNum}City`)[0].classList.replace("inputCity1", "inputCity2");
                    $(`#point${markerNum}Lat`)[0].classList.replace("inputCoorLat1", "inputCoorLat2");
                    $(`#point${markerNum}Long`)[0].classList.replace("inputCoorLong1", "inputCoorLong2");
                    $(`#point${markerNum}Trash`).show();
                }
                markerNum++;
            } while($('.divLocation').length > markerNum)
        }
        markerNum --;
        $('.divLocation')[markerNum].remove();
        if ((`#point${markerNum}City`)[0].value == "" || $(`#point${markerNum}Long`)[0].value == "") {
            $(`#point${markerNum}City`)[0].classList.replace("inputCity2", "inputCity1");
            $(`#point${markerNum}Lat`)[0].classList.replace("inputCoorLat2", "inputCoorLat1");
            $(`#point${markerNum}Long`)[0].classList.replace("inputCoorLong2", "inputCoorLong1");
            $(`#point${markerNum}Trash`).hide();
        }
        $('.waypoint').last().remove();
        $('.waypoint').last()[0].id = `${$('.waypoint').last()[0].id.split('-')[0]}-`;
        if ($('.divLocation').length < 5 && $('.waypoint')[0].style.display == "none") {
            $('.waypoint').show();
        }
        $(`#point${markerNum}City`)[0].placeholder = "Point d'arrivée";
        map.remove();
        map = L.mapquest.map('map', {
            layers: L.mapquest.tileLayer('map'),
            center: [49.894067, 2.295753],
            zoom: 12
        });
        map.on('click', mapClick);
        var tmpMarkers = [];
        $('.divLocation').each(function(index, element) {
            var divnumber = index + 1;
            if ($(`#point${divnumber}City`)[0].value != "" || $(`#point${divnumber}Long`)[0].value != "" || $(`#point${divnumber}Lat`)[0].value != "") {
                var lat = $(`#point${divnumber}Lat`)[0].value;
                var long = $(`#point${divnumber}Long`)[0].value;
                tmpMarkers.push(`${lat},${long}`);
            }
        })
        if (tmpMarkers.length >= 2 || Markers.length >= 2) {
            submitForm();
        } else {
            tmpMarkers.forEach(element => {
                var newMarker = L.marker([element.split(',')[0], element.split(',')[1]], {draggable: true}).addTo(map);
                newMarker.on('dragend', markerDragEnd);
            });
            $('.graphGen').hide();
        }
        removeGraph();
    }
    // Tracage du graphique
    document.getElementById('graphiqueGen').onclick = drawElevationProfile;
    async function drawElevationProfile(event) {
        event.preventDefault();
        await regenDistance();
        if ($('.highcharts-figure')[0].style.display == "none") {
            if (Markers.length >= 2) {
                let elevationData;
                fetch(`https://api.geoapify.com/v1/routing?waypoints=${Markers.join('|')}&mode=mountain_bike&details=elevation&apiKey=${apifyKey}`)
                .then(res => res.json())
                .then(routeResult => {
                    routeData = routeResult;
                    const legElevations = [];

                    routeData.features[0].properties.legs.forEach(leg => {
                        if (leg.elevation_range) {
                        legElevations.push(leg.elevation_range);
                        } else {
                        legElevations.push([]);
                        }
                    });
                    labels = [];
                    data = [];

                    legElevations.forEach((legElevation, index) => {
                        let previousLegsDistance = 0;
                        for (let i = 0; i <= index - 1; i++) {
                        previousLegsDistance += legElevations[i][legElevations[i].length - 1][0];
                        }

                        labels.push(...legElevation.map(elevationData => elevationData[0] + previousLegsDistance));
                        data.push(...legElevation.map(elevationData => elevationData[1]));
                    });

                    // optimize array size to avoid performance problems
                    const labelsOptimized = [];
                    const dataOptimized = [];
                    const minDist = 5; // 5m
                    const minHeight = 10; // ~10m

                    labels.forEach((dist, index) => {
                        if (index === 0 || index === labels.length - 1 ||
                        (dist - labelsOptimized[labelsOptimized.length - 1]) > minDist ||
                        Math.abs(data[index] - dataOptimized[dataOptimized.length - 1]) > minHeight) {
                        labelsOptimized.push(dist);
                        dataOptimized.push(data[index]);
                        }
                    });

                    elevationData = {
                        data: dataOptimized,
                        labels: labelsOptimized
                    };

                    let canvas = document.getElementById("route-elevation-chart");
                    canvas.getContext("2d").clearRect(0,0, canvas.width, canvas.height);
                    const ctx = document.getElementById("route-elevation-chart").getContext("2d");

                    var points = [];

                    Markers.forEach(function (element, index) {
                        points.push({
                            x: Distances[index],
                            y: Altitudes[index],
                        });
                    });

                    const chartData = {
                        labels: elevationData.labels,
                        datasets: [{
                            data: elevationData.data,
                            fill: true,
                            borderColor: '#956200',
                            backgroundColor: '#95620066',
                            borderWidth: 1,
                            tension: 0.1,
                            pointRadius: 0,
                            spanGaps: true
                        }, {
                            label: "Points",
                            data: points,
                            type: "scatter",
                            pointRadius: 2,
                            backgroundColor: "red",
                            borderColor: "red",
                            borderWidth: 3
                        }]
                    };

                    const config = {
                        type: 'line',
                        data: chartData,
                        plugins: [{
                        beforeInit: (chart, args, options) => {
                            const maxHeight = Math.max(...chart.data.datasets[0].data);
                
                            chart.options.scales.x.min = Math.min(...chart.data.labels);
                            chart.options.scales.x.max = Math.max(...chart.data.labels);
                            chart.options.scales.y.max = maxHeight + Math.round(maxHeight * 0.2);
                            chart.options.scales.y1.max = maxHeight + Math.round(maxHeight * 0.2);
                        }
                        }],
                        options: {
                        onHover: function (e, item) {
                            // add hover here!!!
                        },
                        animation: false,
                        maintainAspectRatio: false,
                        interaction: {
                            intersect: false,
                            mode: 'index',
                        },
                        tooltip: {
                            position: 'nearest'
                        },
                        scales: {
                            x: {
                            type: 'linear'
                            },
                            y: {
                            type: 'linear',
                            beginAtZero: true
                            },
                            y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            // grid line settings
                            grid: {
                                drawOnChartArea: false, // only want the grid lines for one axis to show up
                            },
                            },
                        },
                        plugins: {
                            title: {
                            align: "end",
                            display: true,
                            text: "Distance, m / Elevation, m"
                            },
                            legend: {
                            display: false
                            },
                            tooltip: {
                            displayColors: false,
                            callbacks: {
                                title: (tooltipItems) => {
                                return "Distance: " + tooltipItems[0].label + 'm'
                                },
                                label: (tooltipItem) => {
                                return "Elevation: " + tooltipItem.raw + 'm'
                                },
                            }
                            }
                        }
                        }
                    };
                
                    $().empty();
                    const chart = new Chart(ctx, config);
                    $('.highcharts-figure').show();
                    $('.graphGen')[0].innerHTML = "Cacher graphique";
                });
            }
        } else {
            removeGraph();
        }
    }

    function removeGraph() {
        $('.graphGen')[0].innerHTML = "Générer graphique";
        $('.graphique').empty().append(`<canvas id="route-elevation-chart" style="width:100%;height:100%"></canvas>`);
        $('.highcharts-figure').hide();
    }
    
    for (let index = 1; index <= $('.divLocation').length; index++) {
        if ($(`#point${index}City`)[0].value != "" || $(`#point${index}Lat`)[0].value != "" || $(`#point${index}Long`)[0].value != "") {
            $(`#point${index}City`)[0].classList.replace("inputCity1", "inputCity2");
            $(`#point${index}Lat`)[0].classList.replace("inputCoorLat1", "inputCoorLat2");
            $(`#point${index}Long`)[0].classList.replace("inputCoorLong1", "inputCoorLong2");
            $(`#point${index}Trash`).show();
        }
    }

    $('.closeGraph').on('click', removeGraph);
});
