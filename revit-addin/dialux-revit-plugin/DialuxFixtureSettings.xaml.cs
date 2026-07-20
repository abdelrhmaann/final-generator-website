using System;
using System.Windows;
using System.Windows.Controls;

namespace RevitConduitAddin
{
    /// <summary>
    /// Settings window for the DIALux fixture import command.
    /// </summary>
    public partial class DialuxFixtureSettings : Window
    {
        public double FuzzyThreshold { get; private set; } = 0.60;
        public double AreaTolerance { get; private set; } = 0.15;
        public double MountingHeight { get; private set; } = 2.5;
        public bool SkipExisting { get; private set; } = true;
        public bool AutoGrid { get; private set; } = true;

        public DialuxFixtureSettings()
        {
            InitializeComponent();

            // Wire up slider
            FuzzySlider.ValueChanged += (s, e) =>
            {
                FuzzyValue.Text = FuzzySlider.Value.ToString("F2");
            };
        }

        private void OKButton_Click(object sender, RoutedEventArgs e)
        {
            // Validate inputs
            if (!double.TryParse(AreaToleranceBox.Text, out double areaTol))
            {
                MessageBox.Show("Invalid area tolerance value.", "Input Error",
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (!double.TryParse(MountingHeightBox.Text, out double mountH))
            {
                MessageBox.Show("Invalid mounting height value.", "Input Error",
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            FuzzyThreshold = FuzzySlider.Value;
            AreaTolerance = areaTol / 100.0;
            MountingHeight = mountH;
            SkipExisting = SkipExistingCheck.IsChecked ?? true;
            AutoGrid = AutoGridCheck.IsChecked ?? true;

            StatusText.Text = "Settings saved. Ready to import fixtures.";
            DialogResult = true;
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
        }
    }
}
