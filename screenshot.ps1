Add-Type -AssemblyName System.Windows.Forms
$bitmap = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.X, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Y, 0, 0, $bitmap.Size)
$bitmap.Save('screenshot.png')