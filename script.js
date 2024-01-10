const stations = {
    "porto_s_bento": {
        "key": "9401008",
        "name": "PORTO S. BENTO"
    }, 
    "trofa": {
        "key": "9404630",
        "name": "TROFA"
    }
}

class DataObject {
    constructor(data = []) {
        this.data = data;
    }

    add(dataHoraPartidaChegada, nomeEstacaoOrigem, nomeEstacaoDestino, operador, tipoServico, observacoes) {
        this.data.push({
            dataHoraPartidaChegada: dataHoraPartidaChegada,
            nomeEstacaoOrigem: nomeEstacaoOrigem,
            nomeEstacaoDestino: nomeEstacaoDestino,
            operador: operador,
            tipoServico: tipoServico,
            observacoes: observacoes
        });
    }
}

// Set default values
let now = new Date();
document.getElementById('start-date').valueAsDate = now;
document.getElementById('where-am-i').value = "porto_s_bento";

function loader() {
    var loader = document.getElementById('loader');
    var table = document.getElementById('table');
    setTimeout(function () {
       loader.style.display = 'none';
       table.style.display = 'block';
    }, 3000);
   }
   
   loader();

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

function fetchData() {
    clearData();

    let startDateInput = document.getElementById('start-date');
    let startDate = startDateInput.value ? new Date(startDateInput.value) : new Date();
    let startTime = startDate.toDateString() == now.toDateString() ? now.toTimeString().substring(0,5) : "00:00";
    let endDate = startDate;
    let endTime = "23:59";

    let startDateTime = new Date(`${startDate.toISOString().split('T')[0]}T${startTime}`);
    let endDateTime = new Date(`${endDate.toISOString().split('T')[0]}T${endTime}`);

    let whereAmI = document.getElementById('where-am-i').value;
    let stationCode = stations[whereAmI].key;

    // Divide the time into 3 different time frames
    let timeFrameDuration = (endDateTime - startDateTime) / 3;
    let timeFrame1End = new Date(startDateTime.getTime() + timeFrameDuration);
    let timeFrame2End = new Date(timeFrame1End.getTime() + timeFrameDuration);

    Promise.all([
        fetchDataForTimeFrame(startDateTime, timeFrame1End, stationCode),
        fetchDataForTimeFrame(timeFrame1End, timeFrame2End, stationCode),
        fetchDataForTimeFrame(timeFrame2End, endDateTime, stationCode),
    ])
    .then(values => {
        const dataToShow = [].concat(...values);
        addDataToTable(new DataObject(dataToShow));
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
}

function fetchDataForTimeFrame(startDateTime, endDateTime, stationCode) {
    let url = `https://corsproxy.io/?https%3A%2F%2Fwww.infraestruturasdeportugal.pt%2Fnegocios-e-servicos%2Fpartidas-chegadas%2F${stationCode}%2F${encodeURIComponent(formatDate(startDateTime))}%2F${encodeURIComponent(formatDate(endDateTime))}%2FINTERNACIONAL%2C%2520ALFA%2C%2520IC%2C%2520IR%2C%2520REGIONAL%2C%2520URB%7CSUBUR%2C%2520ESPECIAL`;

    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            let estacoes = data.response[0].NodesComboioTabelsPartidasChegadas;
            let dataObject = new DataObject();
            for (let i = 0; i < estacoes.length; i++) {
                dataObject.add(
                    estacoes[i].DataHoraPartidaChegada,
                    estacoes[i].NomeEstacaoOrigem,
                    estacoes[i].NomeEstacaoDestino,
                    estacoes[i].Operador,
                    estacoes[i].TipoServico,
                    estacoes[i].Observacoes,
                );
            }
            return dataObject.data;
        });
}

function addDataToTable(dataObject) {
    let estacoes = dataObject.data;
    for (let i = 0; i < estacoes.length; i++) {
        let table = document.getElementById('data-table');
        let row = table.insertRow(-1);
        let dataHoraPartidaChegada = row.insertCell(0);
        let nomeEstacaoOrigem = row.insertCell(1);
        let nomeEstacaoDestino = row.insertCell(2);
        let tipoServico = row.insertCell(3);
        let observacoes = row.insertCell(4);
        dataHoraPartidaChegada.innerHTML = estacoes[i].dataHoraPartidaChegada;
        nomeEstacaoOrigem.innerHTML = estacoes[i].nomeEstacaoOrigem;
        nomeEstacaoDestino.innerHTML = estacoes[i].nomeEstacaoDestino;
        tipoServico.innerHTML = estacoes[i].tipoServico;
        observacoes.innerHTML = estacoes[i].observacoes;

        if (dataObject.data[i].observacoes == "SUPRIMIDO") {
            table.rows[i + 1].style.backgroundColor = "#771919";
        } else if (dataObject.data[i].observacoes == "ATRASADO") {
            table.rows[i + 1].style.backgroundColor = "#e6b800";
        } else {
            table.rows[i + 1].style.backgroundColor = "#0e2b0c"
        }
    }
    
}

fetchData();