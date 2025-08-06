'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, QrCode, Flashlight, RotateCcw, History, X, Copy, Share2, Check, User, Bell, Trash2, RefreshCw, Clock, Coffee, Loader2 } from 'lucide-react';
import jsQR, { QRCode } from 'jsqr';
import axios from 'axios';

// Установка: npm install jsqr @types/jsqr

// Типы
interface ScanHistoryItem {
    data: string;
    timestamp: string;
    id: number;
}

interface AddCupResponse {
    status: number;
    message: string;
    user: {
        id: number;
        cupCount: number;
        maxCups: number;
        canAddMore: boolean;
        isFreeCoffee: boolean;
        cupsUntilFree: number;
    };
}

interface AddCupError {
    status: number;
    message: string;
}

type FacingMode = 'user' | 'environment';

interface CameraConstraints {
    video: {
        facingMode: FacingMode;
        width: { ideal: number; max: number };
        height: { ideal: number; max: number };
        frameRate: { ideal: number; max: number };
    };
}

interface MediaTrackCapabilities {
    torch?: boolean;
}

const addCup = async (id: string): Promise<AddCupResponse | AddCupError> => {
    try {
        const res = await axios.post(`http://84.54.12.45:5000/api/user/${id}/add-cup`);
        return res.data as AddCupResponse;
    }
    catch (e: any) {
        return e.response.data as AddCupError;
    }
}

const HomeScreen: React.FC = () => {
    // State с типизацией
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [scannedData, setScannedData] = useState<string>('');
    const [flashOn, setFlashOn] = useState<boolean>(false);
    const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
    const [showHistory, setShowHistory] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [copied, setCopied] = useState<boolean>(false);
    const [facingMode, setFacingMode] = useState<FacingMode>('environment');
    const [dimensions, setDimensions] = useState<string>('396 × 217');

    // Новые состояния для обработки запроса addCup
    const [isAddingCup, setIsAddingCup] = useState<boolean>(false);
    const [cupResponse, setCupResponse] = useState<AddCupResponse | null>(null);
    const [cupError, setCupError] = useState<string>('');

    // Refs с типизацией
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Реальная функция для доступа к камере с дополнительными опциями
    const startCamera = async (): Promise<boolean> => {
        try {
            setError('');

            const constraints: CameraConstraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30, max: 60 }
                }
            };

            const stream: MediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;

                // Обработчик загрузки метаданных видео
                videoRef.current.onloadedmetadata = (): void => {
                    if (videoRef.current) {
                        // Обновляем размеры после загрузки видео
                        const width = videoRef.current.videoWidth;
                        const height = videoRef.current.videoHeight;
                        setDimensions(`${width} × ${height}`);

                        videoRef.current.play().catch((err: Error) => {
                            console.error('Video play error:', err);
                            setError('Ошибка воспроизведения видео');
                        });
                    }
                };
            }

            return true;
        } catch (err: unknown) {
            console.error('Camera access error:', err);

            // Более детальная обработка ошибок
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError') {
                    setError('Доступ к камере запрещен. Разрешите использование камеры в настройках браузера.');
                } else if (err.name === 'NotFoundError') {
                    setError('Камера не найдена. Убедитесь, что устройство имеет камеру.');
                } else if (err.name === 'NotReadableError') {
                    setError('Камера используется другим приложением.');
                } else {
                    setError('Не удалось получить доступ к камере. Попробуйте обновить страницу.');
                }
            } else {
                setError('Неизвестная ошибка при доступе к камере.');
            }

            return false;
        }
    };

    // Остановка камеры
    const stopCamera = (): void => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
    };

    // Функция сканирования QR кода с jsQR
    const scanQRCode = (): void => {
        if (!videoRef.current || !canvasRef.current) return;

        const video: HTMLVideoElement = videoRef.current;
        const canvas: HTMLCanvasElement = canvasRef.current;
        const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');

        if (!ctx) return;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            // Устанавливаем размеры canvas равными размерам видео
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Рисуем текущий кадр видео на canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Получаем данные изображения
            const imageData: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Используем jsQR для поиска QR кода
            const code: QRCode | null = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert", // Оптимизация для лучшей производительности
            });

            if (code) {
                console.log('QR Code detected:', code.data);
                handleQRDetected(code.data);
            }
        }
    };

    // Функция для автоматического добавления чашки после сканирования
    const handleAddCup = async (userId: string): Promise<void> => {
        setIsAddingCup(true);
        setCupError('');
        setCupResponse(null);

        try {
            const response = await addCup(userId);

            if (response.status === 200) {
                setCupResponse(response as AddCupResponse);
                // Вибрация при успешном добавлении чашки
                if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200, 100, 200]);
                }
            } else {
                setCupError(response.message || 'Не удалось добавить чашку');
            }
        } catch (error) {
            console.error('Error adding cup:', error);
            setCupError('Ошибка подключения к серверу');
        } finally {
            setIsAddingCup(false);
        }
    };

    // Обработка найденного QR кода
    const handleQRDetected = async (data: string): Promise<void> => {
        setScannedData(data);
        setIsScanning(false);

        // Добавление в историю
        const newScan: ScanHistoryItem = {
            data: data,
            timestamp: new Date().toLocaleString('ru-RU'),
            id: Date.now()
        };

        setScanHistory((prev: ScanHistoryItem[]) => [newScan, ...prev]);

        // Остановка сканирования
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }

        // Вибрация при успешном сканировании
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

        // Автоматически вызываем addCup с полученным ID
        await handleAddCup(data);
    };

    // Начало сканирования с оптимизацией для мобильных устройств
    const startScanning = async (): Promise<void> => {
        const cameraStarted: boolean = await startCamera();
        if (!cameraStarted) return;

        setIsScanning(true);
        setScannedData('');
        setError('');
        setCupError('');
        setCupResponse(null);

        // Ждем загрузки видео
        if (videoRef.current) {
            videoRef.current.addEventListener('loadedmetadata', (): void => {
                // Начинаем сканирование с частотой 10 FPS для лучшей производительности
                scanIntervalRef.current = setInterval(scanQRCode, 100);
            });
        } else {
            // Fallback если видео уже загружено
            scanIntervalRef.current = setInterval(scanQRCode, 100);
        }
    };

    // Остановка сканирования
    const stopScanning = (): void => {
        setIsScanning(false);
        stopCamera();
    };

    // Переключение вспышки с проверкой поддержки
    const toggleFlash = async (): Promise<void> => {
        if (!streamRef.current) return;

        try {
            const track: MediaStreamTrack = streamRef.current.getVideoTracks()[0];
            const capabilities = track.getCapabilities() as MediaTrackCapabilities;

            if (capabilities.torch) {
                await track.applyConstraints({
                    advanced: [{ torch: !flashOn } as any]
                });
                setFlashOn(!flashOn);
            } else {
                console.log('Torch not supported on this device');
                setError('Вспышка не поддерживается на этом устройстве');
                setTimeout(() => setError(''), 3000);
            }
        } catch (err: unknown) {
            console.error('Flash toggle error:', err);
            setError('Не удалось включить/выключить вспышку');
            setTimeout(() => setError(''), 3000);
        }
    };

    // Переключение камеры
    const switchCamera = (): void => {
        setFacingMode((prevMode: FacingMode) => prevMode === 'environment' ? 'user' : 'environment');
        if (isScanning) {
            stopScanning();
            setTimeout(startScanning, 100);
        }
    };

    // Копирование в буфер обмена
    const copyToClipboard = async (text: string): Promise<void> => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err: unknown) {
            console.error('Copy failed:', err);
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Поделиться
    const shareData = async (text: string): Promise<void> => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'QR Code Scanner',
                    text: text,
                    url: text.startsWith('http') ? text : undefined
                });
            } catch (err: unknown) {
                console.error('Share failed:', err);
                copyToClipboard(text);
            }
        } else {
            copyToClipboard(text);
        }
    };

    // Сброс
    const resetScan = (): void => {
        setScannedData('');
        setError('');
        setCupError('');
        setCupResponse(null);
        stopScanning();
    };

    // Очистка истории
    const clearHistory = (): void => {
        setScanHistory([]);
    };

    // Удаление элемента из истории
    const removeFromHistory = (id: number): void => {
        setScanHistory(prev => prev.filter(item => item.id !== id));
    };

    // Очистка ресурсов при размонтировании
    useEffect((): (() => void) => {
        return (): void => {
            stopCamera();
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#F7E7D8] relative overflow-hidden pb-20">
            {/* Main Content */}
            <main className="px-6 py-6">
                {!showHistory ? (
                    <>
                        {/* Scanner Area */}
                        <div className="text-center mb-6">
                            <div className="inline-block bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-medium mb-3 shadow-md">
                                {dimensions}
                            </div>

                            <div className="relative mx-auto w-80 h-80 bg-[#E0D1C3] rounded-3xl overflow-hidden border-4 border-[#D4C5B8] shadow-lg">
                                {/* Video Stream */}
                                <video
                                    ref={videoRef}
                                    className="w-full h-full object-cover"
                                    autoPlay
                                    playsInline
                                    muted
                                />

                                {/* Hidden canvas for QR processing */}
                                <canvas ref={canvasRef} className="hidden" />

                                {/* Scanner overlay */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {!isScanning && !scannedData && !error && !isAddingCup && (
                                        <div className="text-center">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-[#F7E7D8] rounded-full shadow-lg flex items-center justify-center animate-pulse border border-[#D4C5B8]">
                                                <QrCode className="w-8 h-8 text-gray-700" />
                                            </div>
                                            <p className="text-gray-700 font-medium">Отсканируйте QR-код</p>
                                            <p className="text-gray-600 text-sm">для получения информации</p>
                                        </div>
                                    )}

                                    {isScanning && (
                                        <div className="relative">
                                            {/* Scanning frame без блюра */}
                                            <div className="relative w-64 h-48 border-4 border-blue-600 rounded-2xl bg-white/20">
                                                {/* Corner indicators */}
                                                <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-blue-600 rounded-tl-xl animate-pulse"></div>
                                                <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-blue-600 rounded-tr-xl animate-pulse delay-150"></div>
                                                <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-blue-600 rounded-bl-xl animate-pulse delay-300"></div>
                                                <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-blue-600 rounded-br-xl animate-pulse delay-450"></div>

                                                {/* Scanning line animation */}
                                                <div className="absolute inset-4 overflow-hidden rounded-lg">
                                                    <div className="h-1 bg-blue-600 animate-pulse shadow-lg shadow-blue-600/50 rounded-full"></div>
                                                </div>
                                            </div>

                                            <div className="mt-4 bg-white/95 rounded-full px-6 py-2 shadow-lg border border-gray-200">
                                                <p className="text-blue-700 font-medium text-sm">Сканирование...</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Loading state для добавления чашки */}
                                    {isAddingCup && (
                                        <div className="text-center bg-white/95 rounded-2xl p-6 shadow-lg border border-blue-200">
                                            <Loader2 className="w-12 h-12 mx-auto mb-3 text-blue-500 animate-spin" />
                                            <p className="text-blue-600 text-sm font-medium">Добавляем чашку...</p>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="text-center bg-white/95 rounded-2xl p-6 shadow-lg border border-red-200">
                                            <X className="w-12 h-12 mx-auto mb-3 text-red-500" />
                                            <p className="text-red-600 text-sm font-medium max-w-48">{error}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Flash indicator */}
                                {flashOn && (
                                    <div className="absolute top-4 right-4 w-3 h-3 bg-yellow-400 rounded-full animate-ping shadow-lg shadow-yellow-400/50"></div>
                                )}

                                {/* Camera switch button */}
                                <button
                                    onClick={switchCamera}
                                    className="absolute top-4 left-4 p-2 bg-white/95 rounded-full shadow-lg hover:bg-white transition-all hover:scale-105 border border-gray-200"
                                    type="button"
                                    aria-label="Переключить камеру"
                                >
                                    <RotateCcw className="w-4 h-4 text-gray-700" />
                                </button>
                            </div>
                        </div>

                        {/* Cup Response Results */}
                        {cupResponse && (
                            <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-2xl shadow-md">
                                <div className="flex items-center mb-3">
                                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3 shadow-md">
                                        <Coffee className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-green-800">
                                        {cupResponse.user.isFreeCoffee ? '🎉 Бесплатный кофе!' : 'Чашка добавлена!'}
                                    </h3>
                                </div>

                                <div className="p-4 bg-white rounded-xl border border-green-100 mb-4 shadow-sm">
                                    <p className="text-sm text-green-700 mb-2">{cupResponse.message}</p>
                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-green-600">{cupResponse.user.cupCount}</p>
                                            <p className="text-xs text-gray-600">Чашек собрано</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-orange-600">{cupResponse.user.cupsUntilFree}</p>
                                            <p className="text-xs text-gray-600">До бесплатной</p>
                                        </div>
                                    </div>

                                    {/* Прогресс бар */}
                                    <div className="mt-4">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full transition-all duration-500 ease-out"
                                                style={{ width: `${(cupResponse.user.cupCount / cupResponse.user.maxCups) * 100}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1 text-center">
                                            {cupResponse.user.cupCount} из {cupResponse.user.maxCups} чашек
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Cup Error */}
                        {cupError && (
                            <div className="mb-6 p-6 bg-red-50 border border-red-200 rounded-2xl shadow-md">
                                <div className="flex items-center mb-3">
                                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3 shadow-md">
                                        <X className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-red-800">Ошибка</h3>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-red-100 shadow-sm">
                                    <p className="text-sm text-red-700">{cupError}</p>
                                </div>
                            </div>
                        )}

                        {/* QR Results */}
                        {scannedData && !isAddingCup && (
                            <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-2xl shadow-md">
                                <div className="flex items-center mb-3">
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3 shadow-md">
                                        <Check className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-blue-800">QR-код отсканирован!</h3>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-blue-100 mb-4 shadow-sm">
                                    <p className="text-sm font-mono break-all text-gray-800">ID: {scannedData}</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => copyToClipboard(scannedData)}
                                        className="flex-1 py-3 px-4 bg-white border border-blue-200 rounded-xl font-medium text-sm text-blue-700 hover:bg-blue-50 transition-all flex items-center justify-center shadow-sm hover:shadow-md"
                                        type="button"
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        {copied ? 'Скопировано!' : 'Копировать'}
                                    </button>
                                    <button
                                        onClick={() => shareData(scannedData)}
                                        className="flex-1 py-3 px-4 bg-blue-500 rounded-xl font-medium text-sm text-white hover:bg-blue-600 transition-all flex items-center justify-center shadow-md hover:shadow-lg"
                                        type="button"
                                    >
                                        <Share2 className="w-4 h-4 mr-2" />
                                        Поделиться
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Control buttons */}
                        <div className="space-y-4 mb-6">
                            {!isScanning ? (
                                <button
                                    onClick={startScanning}
                                    disabled={isAddingCup}
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold text-lg hover:bg-blue-700 transition-all flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    type="button"
                                >
                                    <Camera className="w-6 h-6 mr-2" />
                                    Сканировать QR-код
                                </button>
                            ) : (
                                <button
                                    onClick={stopScanning}
                                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-semibold text-lg hover:bg-red-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                                    type="button"
                                >
                                    Остановить сканирование
                                </button>
                            )}

                            {(scannedData || cupResponse || cupError) && (
                                <button
                                    onClick={resetScan}
                                    className="w-full py-3 bg-gray-500 text-white rounded-2xl font-medium text-base hover:bg-gray-600 transition-all shadow-md hover:shadow-lg"
                                    type="button"
                                >
                                    <RefreshCw className="w-5 h-5 mr-2 inline" />
                                    Сканировать заново
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    /* History Screen */
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">История сканирований</h2>
                            <div className="flex gap-2">
                                {scanHistory.length > 0 && (
                                    <button
                                        onClick={clearHistory}
                                        className="py-2 px-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all flex items-center gap-1"
                                        type="button"
                                        aria-label="Очистить историю"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowHistory(false)}
                                    className="py-2 px-4 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all"
                                    type="button"
                                >
                                    Назад
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {scanHistory.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-[#F7E7D8] rounded-full flex items-center justify-center border border-[#D4C5B8]">
                                        <QrCode className="w-8 h-8 text-gray-500" />
                                    </div>
                                    <p className="text-gray-700 font-medium">История пуста</p>
                                    <p className="text-gray-600 text-sm mt-2">Отсканированные QR-коды появятся здесь</p>
                                </div>
                            ) : (
                                scanHistory.map((item: ScanHistoryItem) => (
                                    <div key={item.id} className="p-4 bg-[#F7E7D8] rounded-xl border border-[#D4C5B8] hover:shadow-md transition-all shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-sm text-gray-600 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {item.timestamp}
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => copyToClipboard(item.data)}
                                                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-[#E0D1C3] rounded transition-all"
                                                    type="button"
                                                    aria-label="Копировать"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => shareData(item.data)}
                                                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-[#E0D1C3] rounded transition-all"
                                                    type="button"
                                                    aria-label="Поделиться"
                                                >
                                                    <Share2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => removeFromHistory(item.id)}
                                                    className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                                    type="button"
                                                    aria-label="Удалить"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="font-mono text-sm break-all bg-[#E0D1C3] p-3 rounded-lg text-gray-800 border border-[#D4C5B8]">{item.data}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#E0D1C3] border-t border-[#D4C5B8] px-6 py-4 shadow-lg">
                <div className="flex justify-center gap-12">
                    <button
                        onClick={() => setShowHistory(true)}
                        className="py-3 px-6 bg-[#F7E7D8] text-gray-700 rounded-xl font-medium hover:bg-[#F0E1D2] transition-all relative shadow-md hover:shadow-lg border border-[#D4C5B8]"
                        type="button"
                        aria-label="История"
                    >
                        <Clock className="w-6 h-6 mx-auto" />
                        {scanHistory.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center animate-pulse shadow-lg">
                                {scanHistory.length > 99 ? '99+' : scanHistory.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Стили для анимаций */}
            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default HomeScreen;