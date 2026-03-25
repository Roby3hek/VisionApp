// Основные переменные
let originalImage = null;
let processedImage = null;
let originalCanvas, processedCanvas;
let originalCtx, processedCtx;
let histogramChart = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Получаем элементы
    originalCanvas = document.getElementById('originalCanvas');
    processedCanvas = document.getElementById('processedCanvas');
    originalCtx = originalCanvas.getContext('2d');
    processedCtx = processedCanvas.getContext('2d');
    
    // Установка размеров canvas
    function resizeCanvases() {
        const container = document.querySelector('.canvas-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        originalCanvas.width = width;
        originalCanvas.height = height;
        processedCanvas.width = width;
        processedCanvas.height = height;
        
        // Перерисовываем изображения при изменении размера
        if (originalImage) {
            displayImage(originalImage, originalCanvas, originalCtx, 'originalPlaceholder');
        }
        if (processedImage) {
            displayImage(processedImage, processedCanvas, processedCtx, 'processedPlaceholder');
        }
    }
    
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);
    
    // Инициализация событий
    initEvents();
    
    // Загрузка OpenCV
    initOpenCV();
});

// Инициализация всех обработчиков событий
function initEvents() {
    // Загрузка файла
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = 'rgba(52, 152, 219, 0.2)';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.backgroundColor = 'rgba(52, 152, 219, 0.05)';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = 'rgba(52, 152, 219, 0.05)';
        if (e.dataTransfer.files.length) {
            loadImage(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            loadImage(e.target.files[0]);
        }
    });
    
    // Основные операции
    document.getElementById('grayscaleBtn').addEventListener('click', convertToGrayscale);
    document.getElementById('histogramBtn').addEventListener('click', showHistogram);
    document.getElementById('resetBtn').addEventListener('click', resetImage);
    document.getElementById('applyCorrectionBtn').addEventListener('click', applyCorrections);
    
    // Фильтры
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            applyFilter(filter);
        });
    });
    
    // Сохранение
    document.getElementById('saveBtn').addEventListener('click', saveImage);
    
    // Слайдеры
    const brightnessSlider = document.getElementById('brightnessSlider');
    const contrastSlider = document.getElementById('contrastSlider');
    const saturationSlider = document.getElementById('saturationSlider');
    
    brightnessSlider.addEventListener('input', function() {
        document.getElementById('brightnessValue').textContent = this.value + '%';
    });
    
    contrastSlider.addEventListener('input', function() {
        document.getElementById('contrastValue').textContent = this.value + '%';
    });
    
    saturationSlider.addEventListener('input', function() {
        document.getElementById('saturationValue').textContent = this.value + '%';
    });
    
    // Модальные окна
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');
    
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', function(e) {
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Управление гистограммой
    document.getElementById('histogramGrayscale').addEventListener('click', () => drawHistogram('grayscale'));
    document.getElementById('histogramRGB').addEventListener('click', () => drawHistogram('rgb'));
    document.getElementById('histogramRed').addEventListener('click', () => drawHistogram('red'));
    document.getElementById('histogramGreen').addEventListener('click', () => drawHistogram('green'));
    document.getElementById('histogramBlue').addEventListener('click', () => drawHistogram('blue'));
}

// Инициализация OpenCV
function initOpenCV() {
    if (typeof cv === 'undefined') {
        console.log('OpenCV.js загружается...');
        setTimeout(initOpenCV, 100);
    } else {
        console.log('OpenCV.js успешно загружен');
        updateStatus('OpenCV.js готов к работе');
    }
}

// Загрузка изображения
function loadImage(file) {
    if (!file.type.match('image.*')) {
        alert('Пожалуйста, выберите файл изображения');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        // Создаем оригинальное изображение
        const originalImg = new Image();
        originalImg.onload = function() {
            originalImage = originalImg;
            
            // Создаем обработанное изображение как копию
            const processedImg = new Image();
            processedImg.onload = function() {
                processedImage = processedImg;
                
                // Отображаем оба изображения
                displayImage(originalImage, originalCanvas, originalCtx, 'originalPlaceholder');
                displayImage(processedImage, processedCanvas, processedCtx, 'processedPlaceholder');
                
                updateImageInfo(file);
                updateStatus(`Изображение загружено: ${file.name}`);
            };
            processedImg.src = e.target.result; // Используем тот же DataURL
        };
        originalImg.src = e.target.result;
    };
    
    reader.onerror = function(e) {
        console.error('Ошибка чтения файла:', e);
        updateStatus('Ошибка загрузки изображения');
    };
    
    reader.readAsDataURL(file);
}

// Отображение изображения на canvas
function displayImage(img, canvas, ctx, placeholderId) {
    if (!img || !canvas || !ctx) return;
    
    const placeholder = document.getElementById(placeholderId);
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    
    canvas.style.display = 'block';
    
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Масштабируем изображение под canvas
    const scale = Math.min(
        canvas.width / img.width,
        canvas.height / img.height
    );
    
    const x = (canvas.width - img.width * scale) / 2;
    const y = (canvas.height - img.height * scale) / 2;
    
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
}

// Обновление информации об изображении
function updateImageInfo(file) {
    const infoBox = document.getElementById('infoBox');
    
    if (!originalImage) {
        infoBox.innerHTML = '<p>Загрузите изображение для просмотра информации</p>';
        return;
    }
    
    const info = `
        <p><strong>Имя файла:</strong> ${file.name}</p>
        <p><strong>Размер файла:</strong> ${file.size ? (file.size / 1024).toFixed(2) + ' KB' : 'N/A'}</p>
        <p><strong>Разрешение:</strong> ${originalImage.width} × ${originalImage.height}</p>
        <p><strong>Глубина цвета:</strong> 24 бита (RGB)</p>
        <p><strong>Формат:</strong> ${file.name.split('.').pop().toUpperCase()}</p>
        <p><strong>Пропорции:</strong> ${(originalImage.width / originalImage.height).toFixed(2)}</p>
        <p><strong>Цветовое пространство:</strong> sRGB</p>
    `;
    
    infoBox.innerHTML = info;
}

// Преобразование в градации серого
function convertToGrayscale() {
    if (!processedImage) {
        alert('Сначала загрузите изображение');
        return;
    }
    
    // Создаем временный canvas для обработки
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = processedImage.width;
    tempCanvas.height = processedImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Рисуем изображение на временном canvas
    tempCtx.drawImage(processedImage, 0, 0);
    
    // Получаем данные изображения
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    // Преобразуем в градации серого (упрощенный метод)
    for (let i = 0; i < data.length; i += 4) {
        // Простое среднее значение
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;     // red
        data[i + 1] = avg; // green
        data[i + 2] = avg; // blue
    }
    
    tempCtx.putImageData(imageData, 0, 0);
    
    // Создаем новое изображение из canvas
    const newImage = new Image();
    newImage.onload = function() {
        processedImage = newImage;
        displayImage(processedImage, processedCanvas, processedCtx, 'processedPlaceholder');
        updateStatus('Изображение преобразовано в градации серого');
    };
    
    // Проверяем, что canvas имеет данные
    if (tempCanvas.toDataURL().length < 100) {
        console.error('Canvas пустой после преобразования');
        updateStatus('Ошибка: не удалось преобразовать изображение');
        return;
    }
    
    newImage.src = tempCanvas.toDataURL();
}

// Применение коррекций (яркость, контраст, насыщенность)
function applyCorrections() {
    if (!processedImage) {
        alert('Сначала загрузите изображение');
        return;
    }
    
    const brightness = parseInt(document.getElementById('brightnessSlider').value) / 100;
    const contrast = parseInt(document.getElementById('contrastSlider').value) / 100;
    const saturation = parseInt(document.getElementById('saturationSlider').value) / 100;
    
    // Создаем временный canvas для обработки
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = processedImage.width;
    tempCanvas.height = processedImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Рисуем изображение на временном canvas
    tempCtx.drawImage(processedImage, 0, 0);
    
    // Получаем данные изображения
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    // Применяем коррекции
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        
        // Яркость (простое умножение)
        r = r * brightness;
        g = g * brightness;
        b = b * brightness;
        
        // Контраст
        const contrastFactor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;
        
        // Насыщенность
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * saturation;
        g = gray + (g - gray) * saturation;
        b = gray + (b - gray) * saturation;
        
        // Ограничиваем значения 0-255
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
    }
    
    // Возвращаем обработанные данные
    tempCtx.putImageData(imageData, 0, 0);
    
    // Создаем новое изображение из canvas
    const newImage = new Image();
    newImage.onload = function() {
        processedImage = newImage;
        displayImage(processedImage, processedCanvas, processedCtx, 'processedPlaceholder');
        updateStatus(`Применена коррекция: Яркость=${brightness.toFixed(2)}, Контраст=${contrast.toFixed(2)}, Насыщенность=${saturation.toFixed(2)}`);
    };
    newImage.src = tempCanvas.toDataURL();
}

// Применение фильтров OpenCV
function applyFilter(filterType) {
    if (!processedImage) {
        alert('Сначала загрузите изображение');
        return;
    }
    
    if (typeof cv === 'undefined') {
        alert('OpenCV.js еще загружается. Подождите немного.');
        return;
    }
    
    // Создаем временный canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = processedImage.width;
    tempCanvas.height = processedImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Рисуем изображение на временном canvas
    tempCtx.drawImage(processedImage, 0, 0);
    
    try {
        // Создаем OpenCV матрицу из canvas
        const src = cv.imread(tempCanvas);
        const dst = new cv.Mat();
        
        switch(filterType) {
            case 'sharpen':
                // Ядро для повышения резкости
                const kernel = new cv.Mat(3, 3, cv.CV_32FC1);
                const kernelData = new Float32Array([0, -1, 0, -1, 5, -1, 0, -1, 0]);
                kernel.data32F.set(kernelData);
                cv.filter2D(src, dst, -1, kernel);
                kernel.delete();
                break;
                
            case 'motionBlur':
                // Размытие в движении - правильная реализация
                // Создаем ядро для горизонтального размытия
                const kernelSize = 15;
                const motionKernel = new cv.Mat(kernelSize, kernelSize, cv.CV_32FC1);
                
                // Заполняем центральную строку единицами
                const centerRow = Math.floor(kernelSize / 2);
                for (let i = 0; i < kernelSize; i++) {
                    const index = (centerRow * kernelSize + i) * 4; // 4 канала в CV_32FC1
                    motionKernel.data32F[index / 4] = 1;
                }
                
                // Нормализуем ядро
                cv.normalize(motionKernel, motionKernel, 1, 0, cv.NORM_L1);
                
                // Применяем фильтр
                cv.filter2D(src, dst, -1, motionKernel);
                motionKernel.delete();
                break;
                
            case 'median':
                // Медианный фильтр
                cv.medianBlur(src, dst, 5);
                break;
                
            case 'gaussian':
                // Гауссово размытие
                cv.GaussianBlur(src, dst, new cv.Size(5, 5), 0);
                break;
                
            case 'canny':
                // Детектор Кэнни
                const grayCanny = new cv.Mat();
                cv.cvtColor(src, grayCanny, cv.COLOR_RGBA2GRAY);
                cv.Canny(grayCanny, dst, 50, 150);
                grayCanny.delete();
                break;
                
            case 'roberts':
                // Оператор Робертса - правильная реализация
                const grayRoberts = new cv.Mat();
                cv.cvtColor(src, grayRoberts, cv.COLOR_RGBA2GRAY);
                
                // Создаем ядра Робертса
                const kernelX = new cv.Mat(2, 2, cv.CV_32FC1);
                const kernelY = new cv.Mat(2, 2, cv.CV_32FC1);
                
                // Ядро Робертса для оси X: [[1, 0], [0, -1]]
                kernelX.data32F.set([1, 0, 0, -1]);
                
                // Ядро Робертса для оси Y: [[0, 1], [-1, 0]]
                kernelY.data32F.set([0, 1, -1, 0]);
                
                // Применяем ядра
                const gradX = new cv.Mat();
                const gradY = new cv.Mat();
                cv.filter2D(grayRoberts, gradX, cv.CV_32F, kernelX);
                cv.filter2D(grayRoberts, gradY, cv.CV_32F, kernelY);
                
                // Вычисляем градиент
                cv.magnitude(gradX, gradY, dst);
                
                // Конвертируем в 8-битное изображение
                cv.convertScaleAbs(dst, dst);
                
                // Очищаем память
                grayRoberts.delete();
                kernelX.delete();
                kernelY.delete();
                gradX.delete();
                gradY.delete();
                break;
                
            case 'sobel':
                // Оператор Собеля
                const graySobel = new cv.Mat();
                cv.cvtColor(src, graySobel, cv.COLOR_RGBA2GRAY);
                
                const gradXSobel = new cv.Mat();
                const gradYSobel = new cv.Mat();
                const absGradXSobel = new cv.Mat();
                const absGradYSobel = new cv.Mat();
                
                // Собель по X и Y
                cv.Sobel(graySobel, gradXSobel, cv.CV_16S, 1, 0);
                cv.Sobel(graySobel, gradYSobel, cv.CV_16S, 0, 1);
                
                // Абсолютные значения
                cv.convertScaleAbs(gradXSobel, absGradXSobel);
                cv.convertScaleAbs(gradYSobel, absGradYSobel);
                
                // Объединяем градиенты
                cv.addWeighted(absGradXSobel, 0.5, absGradYSobel, 0.5, 0, dst);
                
                graySobel.delete();
                gradXSobel.delete();
                gradYSobel.delete();
                absGradXSobel.delete();
                absGradYSobel.delete();
                break;
                
            case 'laplacian':
                // Лапласиан
                const grayLaplacian = new cv.Mat();
                cv.cvtColor(src, grayLaplacian, cv.COLOR_RGBA2GRAY);
                cv.Laplacian(grayLaplacian, dst, cv.CV_8U);
                grayLaplacian.delete();
                break;
                
            default:
                dst.delete();
                src.delete();
                return;
        }
        
        // Отображаем результат на canvas
        cv.imshow(tempCanvas, dst);
        
        // Создаем новое изображение из canvas
        const newImage = new Image();
        newImage.onload = function() {
            processedImage = newImage;
            displayImage(processedImage, processedCanvas, processedCtx, 'processedPlaceholder');
            updateStatus(`Применен фильтр: ${getFilterName(filterType)}`);
        };
        newImage.src = tempCanvas.toDataURL();
        
        // Освобождаем память
        dst.delete();
        src.delete();
        
    } catch (err) {
        console.error('Ошибка при применении фильтра:', err);
        alert('Ошибка при обработке изображения. Проверьте консоль для деталей.');
    }
}

// Получение имени фильтра
function getFilterName(filterType) {
    const names = {
        'sharpen': 'Повышение резкости',
        'motionBlur': 'Размытие в движении',
        'median': 'Медианный фильтр',
        'gaussian': 'Гауссово размытие',
        'canny': 'Детектор Кэнни',
        'roberts': 'Оператор Робертса',
        'sobel': 'Оператор Собеля',
        'laplacian': 'Лапласиан'
    };
    return names[filterType] || filterType;
}

// Показать гистограмму
function showHistogram() {
    if (!processedImage) {
        alert('Сначала загрузите изображение');
        return;
    }
    
    const modal = document.getElementById('histogramModal');
    modal.style.display = 'block';
    
    // Создаем гистограмму
    setTimeout(() => drawHistogram('rgb'), 100);
}

// Построение гистограммы
function drawHistogram(type) {
    if (!processedImage) return;
    
    // Создаем временный canvas для анализа
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = processedImage.width;
    tempCanvas.height = processedImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(processedImage, 0, 0);
    
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    const histogramCanvas = document.getElementById('histogramChart');
    const chartCtx = histogramCanvas.getContext('2d');
    
    // Подготавливаем данные
    let datasets = [];
    const bins = 256;
    
    if (type === 'grayscale') {
        const grayValues = new Array(bins).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            grayValues[gray]++;
        }
        
        // Нормализуем
        const max = Math.max(...grayValues);
        const normalized = grayValues.map(val => val / max * 100);
        
        datasets = [{
            label: 'Серый',
            data: normalized,
            borderColor: '#666',
            backgroundColor: 'rgba(102, 102, 102, 0.2)',
            borderWidth: 1,
            fill: true
        }];
    } else {
        const redValues = new Array(bins).fill(0);
        const greenValues = new Array(bins).fill(0);
        const blueValues = new Array(bins).fill(0);
        
        for (let i = 0; i < data.length; i += 4) {
            redValues[data[i]]++;
            greenValues[data[i + 1]]++;
            blueValues[data[i + 2]]++;
        }
        
        // Нормализуем
        const maxRed = Math.max(...redValues);
        const maxGreen = Math.max(...greenValues);
        const maxBlue = Math.max(...blueValues);
        const maxOverall = Math.max(maxRed, maxGreen, maxBlue);
        
        const normalizedRed = redValues.map(val => val / maxOverall * 100);
        const normalizedGreen = greenValues.map(val => val / maxOverall * 100);
        const normalizedBlue = blueValues.map(val => val / maxOverall * 100);
        
        if (type === 'rgb') {
            datasets = [
                {
                    label: 'Красный',
                    data: normalizedRed,
                    borderColor: '#ff0000',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    borderWidth: 1,
                    fill: false
                },
                {
                    label: 'Зеленый',
                    data: normalizedGreen,
                    borderColor: '#00ff00',
                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                    borderWidth: 1,
                    fill: false
                },
                {
                    label: 'Синий',
                    data: normalizedBlue,
                    borderColor: '#0000ff',
                    backgroundColor: 'rgba(0, 0, 255, 0.1)',
                    borderWidth: 1,
                    fill: false
                }
            ];
        } else if (type === 'red') {
            datasets = [{
                label: 'Красный',
                data: normalizedRed,
                borderColor: '#ff0000',
                backgroundColor: 'rgba(255, 0, 0, 0.2)',
                borderWidth: 1,
                fill: true
            }];
        } else if (type === 'green') {
            datasets = [{
                label: 'Зеленый',
                data: normalizedGreen,
                borderColor: '#00ff00',
                backgroundColor: 'rgba(0, 255, 0, 0.2)',
                borderWidth: 1,
                fill: true
            }];
        } else if (type === 'blue') {
            datasets = [{
                label: 'Синий',
                data: normalizedBlue,
                borderColor: '#0000ff',
                backgroundColor: 'rgba(0, 0, 255, 0.2)',
                borderWidth: 1,
                fill: true
            }];
        }
    }
    
    // Уничтожаем предыдущий график
    if (histogramChart) {
        histogramChart.destroy();
    }
    
    // Создаем новый график
    histogramChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: Array.from({length: bins}, (_, i) => i),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Гистограмма изображения'
                },
                legend: {
                    display: true
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Значение пикселя (0-255)'
                    },
                    min: 0,
                    max: 255
                },
                y: {
                    title: {
                        display: true,
                        text: 'Частота (%)'
                    },
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Сброс изображения
function resetImage() {
    if (!originalImage) {
        alert('Сначала загрузите изображение');
        return;
    }
    
    // Создаем новое изображение из оригинала
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.width;
    tempCanvas.height = originalImage.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, 0, 0);
    
    const newImage = new Image();
    newImage.onload = function() {
        processedImage = newImage;
        displayImage(processedImage, processedCanvas, processedCtx, 'processedPlaceholder');
        
        // Сброс слайдеров
        document.getElementById('brightnessSlider').value = 100;
        document.getElementById('contrastSlider').value = 100;
        document.getElementById('saturationSlider').value = 100;
        document.getElementById('brightnessValue').textContent = '100%';
        document.getElementById('contrastValue').textContent = '100%';
        document.getElementById('saturationValue').textContent = '100%';
        
        updateStatus('Изображение сброшено к оригиналу');
    };
    newImage.src = tempCanvas.toDataURL();
}

// Сохранение изображения
function saveImage() {
    if (!processedImage) {
        alert('Нет изображения для сохранения');
        return;
    }
    
    const link = document.createElement('a');
    link.download = 'processed-image.png';
    link.href = processedCanvas.toDataURL('image/png');
    link.click();
    
    updateStatus('Изображение сохранено как processed-image.png');
}

// Обновление статус-бара
function updateStatus(message) {
    const statusBar = document.getElementById('statusBar');
    statusBar.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    // Добавляем анимацию
    statusBar.style.backgroundColor = 'rgba(46, 204, 113, 0.2)';
    setTimeout(() => {
        statusBar.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    }, 1000);
}