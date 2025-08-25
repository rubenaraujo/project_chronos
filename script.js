const stations = {
    "porto_s_bento": {
        "key": "9401008",
        "name": "PORTO S. BENTO"
    }, 
    "trofa": {
        "key": "9404630",
        "name": "TROFA"
    },
    "ermesinde": {
        "key": "9404002",
        "name": "ERMESINDE"
    },
    "vizela": {
        "key": "9428233",
        "name": "VIZELA"
    },
}

const services = {
    "IC": {
        "color": "&#128993"
    },
    "IR": {
        "color": "&#128992"
    },
    "ALFA": {
        "color": "&#128309"
    },
    "REGIONAL": {
        "color": "&#128996"
    },
    "URB|SUBUR": {
        "color": "&#128994"
    },
    "INTERNACIONAL": {
        "color": "&#128995"
    },
    "ESPECIAL": {
        "color": "&#128997"
    }
}

class DataObject {
    constructor(data = []) {
        this.data = data;
    }

    add(tipoServico, dataHoraPartidaChegada, nomeEstacaoOrigem, nomeEstacaoDestino, operador, observacoes, nComboio) {
        this.data.push({
            tipoServico: tipoServico,
            dataHoraPartidaChegada: dataHoraPartidaChegada,
            nomeEstacaoOrigem: nomeEstacaoOrigem,
            nomeEstacaoDestino: nomeEstacaoDestino,
            operador: operador,
            observacoes: observacoes,
            nComboio: nComboio
        });
    }
}

// Set default values
let now = new Date();
document.getElementById('start-date').valueAsDate = now;
document.getElementById('where-am-i').value = "porto_s_bento";
let showPast = false;

function loader(show, isPopup = false) {
    var loader = document.getElementById('loader');
    var table = document.getElementById('table');
    var popup = document.getElementById('popup');
    var popupContent = document.getElementById('popup-content');

    if (show) {
        if (isPopup) {
            loader.style.display = 'block';
            popupContent.style.display = 'none';
            table.style.display = 'none';
            popup.classList.add('popup-loading');
        } else {
            loader.style.display = 'block';
            table.style.display = 'none';
        }
    } else {
        if (isPopup) {
            loader.style.display = 'none';
            popupContent.style.display = 'block';
            popup.classList.remove('popup-loading');
            table.style.display = 'block';
        } else {
            loader.style.display = 'none';
            table.style.display = 'block';
        }
    }
}

function formatDate(date) {
    let year = date.getFullYear();
    let month = ("0" + (date.getMonth() + 1)).slice(-2);
    let day = ("0" + date.getDate()).slice(-2);
    let hour = ("0" + date.getHours()).slice(-2);
    let minute = ("0" + date.getMinutes()).slice(-2);
    return `${year}-${month}-${day}T${hour}:${minute}`;
}

function clearData() {
    let table = document.getElementById('data-table');
    for (let i = table.rows.length - 1; i > 0; i--) {
        table.deleteRow(i);
    }
}

function addSubtitle() {
    let legend = document.getElementById('subtitle');
    legend.innerHTML = "";
    for (let key in services) {
        let color = services[key].color;
        let text = key;
        legend.innerHTML += `<span style="color: ${color}; font-size: 20px;">${color}</span> ${text} &nbsp; &nbsp;`;
    }
}

function fetchData() {
    loader(true);
    clearData();

    let startDateInput = document.getElementById('start-date');
    let startDate = startDateInput.value ? new Date(startDateInput.value) : new Date();
    let startTime = startDate.toDateString() == now.toDateString() && !showPast ? now.toTimeString().substring(0,5) : "00:00";

    let endDate = startDate;
    let endTime = "23:59";

    let startDateTime = new Date(`${startDate.toISOString().split('T')[0]}T${startTime}`);
    let endDateTime = new Date(`${endDate.toISOString().split('T')[0]}T${endTime}`);

    let whereAmI = document.getElementById('where-am-i').value;
    let stationCode = stations[whereAmI].key;

    let duration = (endDateTime - startDateTime)

    // find out how many time frames we need, knowing that for each 6 hours we will get 1 timeframe
    let timeFrameDuration = 6 * 60 * 60 * 1000;
    let numberOfFrames = Math.ceil((duration / timeFrameDuration));
    let promises = [];
    for (var i = 0; i < numberOfFrames; i++) {
        promises.push(fetchDataForTimeFrame(
            new Date(startDateTime.getTime() + (i * timeFrameDuration)),
            new Date(startDateTime.getTime() + ((i + 1) * timeFrameDuration)),
            stationCode
        ));
    }

    Promise.all(promises)
    .then(values => {
        const dataToShow = [].concat(...values);
        addDataToTable(startDate, new DataObject(replaceServices(dataToShow)));
        loader(false)
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
}

function replaceServices(dataToShow) {
    for (let i = 0; i < dataToShow.length; i++) {
        dataToShow[i].tipoServico = services[dataToShow[i].tipoServico].color;
    }
    return dataToShow;
}

function fetchDataForTimeFrame(startDateTime, endDateTime, stationCode) {
    let url = `https://corsproxy.ruben-araujo.workers.dev/corsproxy/?apiurl=https%3A%2F%2Fwww.infraestruturasdeportugal.pt%2Fnegocios-e-servicos%2Fpartidas-chegadas%2F${stationCode}%2F${encodeURIComponent(formatDate(startDateTime))}%2F${encodeURIComponent(formatDate(endDateTime))}%2FINTERNACIONAL%2C%2520ALFA%2C%2520IC%2C%2520IR%2C%2520REGIONAL%2C%2520URB%7CSUBUR%2C%2520ESPECIAL`;

    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.response.length == 0) {
                return [];
            }
            let estacoes = data.response[0].NodesComboioTabelsPartidasChegadas;
            let dataObject = new DataObject();
            for (let i = 0; i < estacoes.length; i++) {
                dataObject.add(
                    estacoes[i].TipoServico,
                    estacoes[i].DataHoraPartidaChegada,
                    estacoes[i].NomeEstacaoOrigem,
                    estacoes[i].NomeEstacaoDestino,
                    estacoes[i].Operador,
                    estacoes[i].Observacoes,
                    estacoes[i].NComboio1
                );
            }
            return dataObject.data;
        });
}

function toggleShowPast() {
    showPast = !showPast;
    fetchData();
    updateButtonColor();
}

function updateButtonColor() {
    const button = document.getElementById('toggle-past-button');
    if (showPast) {
        button.style.color = 'rgb(244,212,164)';
    } else {
        button.style.color = '';
    }
}

function addDataToTable(startDate, dataObject) {
    let estacoes = dataObject.data;
    for (let i = 0; i < estacoes.length; i++) {
        let table = document.getElementById('data-table');
        let row = table.insertRow(-1);
        let tipoServico = row.insertCell(0);
        let dataHoraPartidaChegada = row.insertCell(1);
        let nomeEstacaoOrigem = row.insertCell(2);
        let nomeEstacaoDestino = row.insertCell(3);
        let observacoes = row.insertCell(4);
        let nComboio = estacoes[i].nComboio;
        tipoServico.innerHTML = estacoes[i].tipoServico;
        dataHoraPartidaChegada.innerHTML = estacoes[i].dataHoraPartidaChegada;
        nomeEstacaoOrigem.innerHTML = estacoes[i].nomeEstacaoOrigem;
        nomeEstacaoDestino.innerHTML = estacoes[i].nomeEstacaoDestino;
        observacoes.innerHTML = estacoes[i].observacoes;
        if (dataObject.data[i].observacoes == "SUPRIMIDO") {
            table.rows[i + 1].style.backgroundColor = "#771919";
        } else if (dataObject.data[i].observacoes == "ATRASADO") {
            table.rows[i + 1].style.backgroundColor = "#e6b800";
        } else {
            table.rows[i + 1].style.backgroundColor = "#0e2b0c"
        }
        if (showPast) {
            let now = new Date();
            if (startDate < now) {
                let dataHoraPartidaChegada = new Date(`${now.toISOString().split('T')[0]}T${estacoes[i].dataHoraPartidaChegada}`);
                if (now > dataHoraPartidaChegada) {
                    table.rows[i + 1].style.opacity = 0.2;
                }
            }
        }
        if (nComboio !== undefined) {
            row.addEventListener('click', function() {
                showPopup(nComboio);
            });
        }
    }
}

function parseTrainData(response) {
    const data = response.response;
    return {
        origem: data.Origem,
        destino: data.Destino,
        dataHoraOrigem: data.DataHoraOrigem,
        dataHoraDestino: data.DataHoraDestino,
        duracaoViagem: data.DuracaoViagem,
        operador: data.Operador,
        situacaoComboio: data.SituacaoComboio,
        tipoServico: data.TipoServico,
        nodesPassagem: data.NodesPassagemComboio.map(node => ({
            comboioPassou: node.ComboioPassou,
            horaProgramada: node.HoraProgramada,
            nomeEstacao: node.NomeEstacao,
            observacoes: node.Observacoes
        }))
    };
}

function showPopup(nComboio) {
    loader(true, true);

    fetchDataForTrain(nComboio).then(data => {
        const parsedData = parseTrainData(data);
        document.getElementById('popup').style.display = 'block';
        document.getElementById('popup-content').innerHTML = '';
        loader(false, true);
        document.getElementById('popup-content').innerHTML = `
            <table class="passage-table">
                ${parsedData.nodesPassagem.map((node, index, array) => {
                    let imageSrc;
                    if (index === array.length - 1) {
                        imageSrc = node.comboioPassou ? 'passou-last-true.png' : 'passou-last-false.png';
                    } else {
                        imageSrc = node.comboioPassou ? 'passou-true.png' : 'passou-false.png';
                    }
                    return `
                        <tr>
                            <td>${node.nomeEstacao}</td>
                            <td><img src="${imageSrc}" alt="${node.comboioPassou ? 'True' : 'False'}"></td>
                            <td>${node.horaProgramada}</td>
                        </tr>
                    `;
                }).join('')}
            </table>
        `;
    }).catch(error => {
        loader(false, true);
        document.getElementById('popup-content').innerText = `Error fetching data: ${error.message}`;
    });
}

function fetchDataForTrain(nComboio) {
    let url = `https://corsproxy.io/?https://servicos.infraestruturasdeportugal.pt/negocios-e-servicos/horarios-ncombio/${nComboio}/${new Date().toISOString().split('T')[0]}`;
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        });
}

function closePopup() {
    document.getElementById('popup').style.display = 'none';
}

addSubtitle();
fetchData();