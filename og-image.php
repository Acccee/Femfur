<?php
// Устанавливаем тип контента - картинка
header('Content-Type: image/png');

// Получаем текст из ссылки (например: og-image.php?text=Правила)
$text = isset($_GET['text']) ? $_GET['text'] : 'Femfur Board';

// Создаем холст 1200x630
$img = imagecreatetruecolor(1200, 630);

// Цвета
$dark_grey = imagecolorallocate($img, 30, 30, 30);
$white = imagecolorallocate($img, 255, 255, 255);

// Заливаем фон
imagefill($img, 0, 0, $dark_grey);

// Путь к шрифту (загрузи любой .ttf файл на сервер, например Roboto-Bold.ttf)
$font = './fonts/Roboto-Bold.ttf';

// Рисуем основной текст по центру
// imagettftext(изображение, размер, угол, X, Y, цвет, шрифт, текст)
imagettftext($img, 50, 0, 100, 300, $white, $font, $text);

// Выводим результат
imagepng($img);
imagedestroy($img);
?>
