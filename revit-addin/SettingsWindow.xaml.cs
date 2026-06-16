using System.Windows;

namespace RevitConduitAddin
{
    public partial class SettingsWindow : Window
    {
        public string SelectedSize { get; private set; }
        public double MaxDistance { get; private set; }

        public SettingsWindow()
        {
            InitializeComponent();
        }

        private void OkButton_Click(object sender, RoutedEventArgs e)
        {
            SelectedSize = (SizeComboBox.SelectedItem as System.Windows.Controls.ComboBoxItem).Content.ToString();
            if (double.TryParse(DistanceTextBox.Text, out double dist))
            {
                MaxDistance = dist;
            }
            else
            {
                MaxDistance = 5.0;
            }
            DialogResult = true;
            Close();
        }
    }
}
