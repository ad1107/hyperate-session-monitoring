import { apiKey } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
  const API_KEY = apiKey;
  const API_URL = `wss://app.hyperate.io/socket/websocket?token=${API_KEY}`;
  let connections = {};
  let heartbeatIntervals = {};

  const trackerIDInput = document.getElementById("trackerID");
  const connectButton = document.getElementById("connectButton");
  const heartRateData = document.getElementById("heartRateData");

  connectButton.addEventListener("click", () => {
    const trackerID = trackerIDInput.value.trim();
    if (trackerID) {
      connectToWebSocket(trackerID);
    }
  });

  function connectToWebSocket(trackerID) {
    const connection = new WebSocket(API_URL);

    connection.onopen = () => {
      console.log(`WebSocket Connected for tracker ID: ${trackerID}`);
      connection.send(
        JSON.stringify({
          topic: `hr:${trackerID}`,
          event: "phx_join",
          payload: {},
          ref: 0,
        })
      );

      heartbeatIntervals[trackerID] = setInterval(() => {
        connection.send(
          JSON.stringify({
            topic: "phoenix",
            event: "heartbeat",
            payload: {},
            ref: 0,
          })
        );
      }, 10000);
    };

    connection.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.event === "hr_update") {
        const heartRate = data.payload.hr;
        updateHeartRateDisplay(trackerID, heartRate);
        console.log(`Heart Rate for ${trackerID}: ${heartRate}`);
      }
    };

    connection.onclose = () => {
      console.log(`WebSocket Closed for tracker ID: ${trackerID}`);
      clearInterval(heartbeatIntervals[trackerID]);
      delete heartbeatIntervals[trackerID];
      removeHeartRateDisplay(trackerID);
    };

    connection.onerror = (error) => {
      console.error(`WebSocket Error for tracker ID ${trackerID}: `, error);
    };

    connections[trackerID] = connection;
    addHeartRateDisplay(trackerID);
  }

  function addHeartRateDisplay(trackerID) {
    const row = document.createElement("tr");
    row.id = `row-${trackerID}`;
    row.innerHTML = `
      <td>${Object.keys(connections).length}</td>
      <td>${trackerID}</td>
      <td id="hr-${trackerID}">N/A</td>
      <td><button onclick="disconnectTracker('${trackerID}')">Disconnect</button></td>
    `;
    heartRateData.appendChild(row);
  }

  function updateHeartRateDisplay(trackerID, heartRate) {
    const hrCell = document.getElementById(`hr-${trackerID}`);
    if (hrCell) {
      hrCell.textContent = heartRate;
    }
  }

  function removeHeartRateDisplay(trackerID) {
    const row = document.getElementById(`row-${trackerID}`);
    if (row) {
      row.remove();
    }
  }

  window.disconnectTracker = (trackerID) => {
    if (connections[trackerID]) {
      connections[trackerID].send(
        JSON.stringify({
          topic: `hr:${trackerID}`,
          event: "phx_leave",
          payload: {},
          ref: 0,
        })
      );
      setTimeout(() => {
        connections[trackerID].close();
        delete connections[trackerID];
      }, 100);
    }
  };
});
