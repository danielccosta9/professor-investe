let myChart = null;

// Helper function to extract float value from text (e.g. R$ 40,00 -> 40.0)
function parseValue(text) {
  let cleaned = text.replace('R$', '').replace('~', '').replace('%', '').trim();
  cleaned = cleaned.replace('.', '').replace(',', '.');
  return parseFloat(cleaned);
}

// Dynamic calculations of Totals and average DY from tables
function calculatePortfolioStats() {
  const calcForTable = (tableId, totalTargetId, dyTargetId, kpiValId, kpiDyId) => {
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    let sumPrice = 0;
    let sumDY = 0;
    let count = 0;

    rows.forEach(row => {
      const priceCell = row.querySelector('.price');
      const dyCell = row.querySelector('.dy');
      if (priceCell && dyCell) {
        const price = parseValue(priceCell.innerText);
        const dy = parseValue(dyCell.innerText);
        sumPrice += price;
        sumDY += dy;
        count++;
      }
    });

    const avgDY = sumDY / count;

    // Formats
    const formattedPrice = 'R$ ' + sumPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedDY = avgDY.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

    // Update elements
    document.getElementById(totalTargetId).innerText = formattedPrice;
    document.getElementById(dyTargetId).innerText = formattedDY;
    
    if(kpiValId && kpiDyId) {
      document.getElementById(kpiValId).innerText = formattedPrice;
      document.getElementById(kpiDyId).innerText = 'DY Médio: ' + formattedDY;
    }

    return { price: sumPrice, dy: avgDY };
  };

  const padraoStats = calcForTable('table-padrao', 'total-padrao-tab', 'avg-dy-padrao', 'kpi-padrao-val', 'kpi-padrao-dy');
  const economicaStats = calcForTable('table-economica', 'total-economica-tab', 'avg-dy-economica', 'kpi-economica-val', 'kpi-economica-dy');
}

// Helper function to extract numeric float from formatted currency string (e.g. R$ 10.000,50 -> 10000.5)
function getNumericValue(id) {
  const element = document.getElementById(id);
  if (!element) return 0;
  let text = element.value;
  let cleaned = text.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  return parseFloat(cleaned) || 0;
}

// Projections Calculations
function updateSimulation() {
  const initCapital = getNumericValue('input-aporte-inicial');
  const monthlyAporte = getNumericValue('input-aporte-mensal');
  const years = parseInt(document.getElementById('input-anos').value) || 0;
  const annualRate = parseFloat(document.getElementById('input-retorno').value) || 0;

  // Compound calculations
  const monthlyRate = Math.pow(1 + (annualRate / 100), 1/12) - 1;
  const months = years * 12;

  let totalInvested = initCapital;
  let totalAccumulated = initCapital;

  const labels = [];
  const dataInvested = [];
  const dataAccumulated = [];

  // Year 0
  labels.push('Início');
  dataInvested.push(totalInvested);
  dataAccumulated.push(totalAccumulated);

  for (let m = 1; m <= months; m++) {
    totalInvested += monthlyAporte;
    totalAccumulated = (totalAccumulated + monthlyAporte) * (1 + monthlyRate);

    // Record yearly data points or final month
    if (m % 12 === 0 || m === months) {
      const currentYear = Math.ceil(m / 12);
      labels.push('Ano ' + currentYear);
      dataInvested.push(Math.round(totalInvested));
      dataAccumulated.push(Math.round(totalAccumulated));
    }
  }

  // Update Summary Labels
  const totalJuros = totalAccumulated - totalInvested;
  
  // Determine DY for passive income projection
  let dy = 9.5;
  const defaultBtn = document.getElementById('btn-preset-default');
  const fiiBtn = document.getElementById('btn-preset-fii');
  const padraoDY = parseValue(document.getElementById('avg-dy-padrao').innerText) || 9.25;
  const economicaDY = parseValue(document.getElementById('avg-dy-economica').innerText) || 9.74;

  if (defaultBtn && defaultBtn.classList.contains('active')) {
    dy = padraoDY;
  } else if (fiiBtn && fiiBtn.classList.contains('active')) {
    dy = economicaDY;
  } else {
    dy = annualRate >= 11.75 ? economicaDY : padraoDY;
  }
  
  const monthlyIncome = (totalAccumulated * (dy / 100)) / 12;

  document.getElementById('val-total-investido').innerText = 'R$ ' + Math.round(totalInvested).toLocaleString('pt-BR');
  document.getElementById('val-total-juros').innerText = 'R$ ' + Math.round(totalJuros).toLocaleString('pt-BR');
  document.getElementById('val-patrimonio-final').innerText = 'R$ ' + Math.round(totalAccumulated).toLocaleString('pt-BR');
  document.getElementById('val-rendimento-mensal').innerText = 'R$ ' + Math.round(monthlyIncome).toLocaleString('pt-BR');

  // Update or render Chart.js
  renderChart(labels, dataInvested, dataAccumulated);
}

function renderChart(labels, investedData, accumulatedData) {
  const ctx = document.getElementById('projectionChart').getContext('2d');
  
  if (myChart) {
    myChart.data.labels = labels;
    myChart.data.datasets[0].data = investedData;
    myChart.data.datasets[1].data = accumulatedData;
    myChart.update();
    return;
  }

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Investido (Aportes)',
          data: investedData,
          borderColor: '#64748B',
          backgroundColor: 'rgba(100, 116, 139, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.15
        },
        {
          label: 'Patrimônio Estimado',
          data: accumulatedData,
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37, 99, 237, 0.15)',
          borderWidth: 3,
          fill: true,
          tension: 0.15
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              family: 'Plus Jakarta Sans',
              size: 11,
              weight: '600'
            },
            color: '#1E293B'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#64748B',
            font: {
              family: 'Plus Jakarta Sans',
              size: 10
            }
          }
        },
        y: {
          grid: {
            color: '#E2E8F0'
          },
          ticks: {
            color: '#64748B',
            font: {
              family: 'Plus Jakarta Sans',
              size: 10
            },
            callback: function(value) {
              return 'R$ ' + value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
            }
          }
        }
      }
    }
  });
}

// Set presets for the simulator
function setPreset(profile) {
  // Toggle active states
  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
  
  let initCap = 1000;
  let monthly = 500;
  let yrs = 15;
  let rate = 11;

  if (profile === 'default') {
    document.getElementById('btn-preset-default').classList.add('active');
    initCap = 1000;
    monthly = 500;
    yrs = 15;
    rate = 11;
  } else if (profile === 'fii') {
    document.getElementById('btn-preset-fii').classList.add('active');
    initCap = 2000;
    monthly = 1000;
    yrs = 20;
    rate = 12.5;
  }

  // Sync sliders
  document.getElementById('range-aporte-inicial').value = initCap;
  document.getElementById('range-aporte-mensal').value = monthly;
  document.getElementById('range-anos').value = yrs;
  document.getElementById('range-retorno').value = rate;

  // Sync number inputs (formatted as currency)
  document.getElementById('input-aporte-inicial').value = 'R$ ' + initCap.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('input-aporte-mensal').value = 'R$ ' + monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('input-anos').value = yrs;
  document.getElementById('input-retorno').value = rate.toFixed(1).replace('.', ',');

  updateSimulation();
}

// Formatting helper for typing currency
function formatCurrencyHelper(inputEl) {
  let cursorPosition = inputEl.selectionStart;
  let originalLength = inputEl.value.length;
  
  let digits = inputEl.value.replace(/\D/g, '');
  if (digits === '') {
    inputEl.value = 'R$ 0,00';
  } else {
    let numericValue = parseFloat(digits) / 100;
    inputEl.value = 'R$ ' + numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  
  let newLength = inputEl.value.length;
  let newCursorPosition = cursorPosition + (newLength - originalLength);
  inputEl.setSelectionRange(newCursorPosition, newCursorPosition);
}

// Bi-directional sync event listeners
document.querySelectorAll('.slider-input').forEach(slider => {
  slider.addEventListener('input', () => {
    const id = slider.id.replace('range-', 'input-');
    const input = document.getElementById(id);
    if (input) {
      if (id === 'input-aporte-inicial' || id === 'input-aporte-mensal') {
        input.value = 'R$ ' + parseFloat(slider.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else if (id === 'input-retorno') {
        input.value = parseFloat(slider.value).toFixed(1).replace('.', ',');
      } else {
        input.value = slider.value;
      }
    }
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    updateSimulation();
  });
});

document.querySelectorAll('.num-input').forEach(input => {
  input.addEventListener('input', () => {
    const id = input.id.replace('input-', 'range-');
    const slider = document.getElementById(id);
    
    if (input.id === 'input-aporte-inicial' || input.id === 'input-aporte-mensal') {
      // Format the text input dynamically
      formatCurrencyHelper(input);
      
      if (slider) {
        const val = getNumericValue(input.id);
        slider.value = Math.min(val, parseFloat(slider.max));
      }
    } else {
      if (slider) {
        // Replace comma with dot for float inputs if needed
        let cleanVal = input.value.replace(',', '.');
        slider.value = parseFloat(cleanVal) || 0;
      }
    }
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    updateSimulation();
  });

  input.addEventListener('blur', () => {
    if (input.id === 'input-aporte-inicial' || input.id === 'input-aporte-mensal') {
      formatCurrencyHelper(input);
    } else if (input.id === 'input-retorno') {
      let cleanVal = parseFloat(input.value.replace(',', '.')) || 0;
      input.value = cleanVal.toFixed(1).replace('.', ',');
    }
    updateSimulation();
  });
});

window.addEventListener('DOMContentLoaded', () => {
  calculatePortfolioStats();
  updateSimulation();
});
