import 'package:flutter/material.dart';
import 'package:flutter_highlight/flutter_highlight.dart';
import 'package:flutter_highlight/themes/vs2015.dart';

class InfographicPage extends StatelessWidget {
  const InfographicPage({super.key});

  @override
  Widget build(BuildContext context) {
    final maxContentWidth = 900.0;
    return Scaffold(
      appBar: AppBar(
        title: const Text('BLoC Pattern Infografik'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxContentWidth),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                _buildHeader(context),
                const SizedBox(height: 40),
                _buildBlocDiagram(context),
                const SizedBox(height: 40),
                _buildTextContent(context),
                const SizedBox(height: 40),
                _buildCodeExample(context),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Column(
      children: [
        const Icon(
          Icons.account_tree,
          size: 80,
          color: Colors.deepPurple,
        ),
        const SizedBox(height: 16),
        Text(
          'BLoC Pattern',
          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: Colors.deepPurple,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Business Logic Component',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: Colors.grey[600],
              ),
        ),
      ],
    );
  }

  Widget _buildBlocDiagram(BuildContext context) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            Text(
              'BLoC Arkitektur Flow',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 32),
            _buildFlowItem(
              context,
              icon: Icons.touch_app,
              color: Colors.blue,
              title: '1. User Interaction',
              description: 'Bruger interagerer med UI',
            ),
            _buildArrow(),
            _buildFlowItem(
              context,
              icon: Icons.event,
              color: Colors.orange,
              title: '2. Event',
              description: 'UI dispatcher en event til BLoC',
            ),
            _buildArrow(),
            _buildFlowItem(
              context,
              icon: Icons.settings,
              color: Colors.purple,
              title: '3. BLoC Processing',
              description: 'BLoC behandler event og kalder repository/service',
            ),
            _buildArrow(),
            _buildFlowItem(
              context,
              icon: Icons.storage,
              color: Colors.teal,
              title: '4. Data Layer',
              description: 'Henter data fra API/Database',
            ),
            _buildArrow(),
            _buildFlowItem(
              context,
              icon: Icons.update,
              color: Colors.green,
              title: '5. State Emission',
              description: 'BLoC emitter ny state',
            ),
            _buildArrow(),
            _buildFlowItem(
              context,
              icon: Icons.visibility,
              color: Colors.indigo,
              title: '6. UI Update',
              description: 'BlocBuilder rebuilder UI automatisk',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFlowItem(
    BuildContext context, {
    required IconData icon,
    required Color color,
    required String title,
    required String description,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color, width: 2),
      ),
      child: Row(
        children: [
          Icon(icon, size: 40, color: color),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[700],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildArrow() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Icon(
        Icons.arrow_downward,
        size: 32,
        color: Colors.grey[400],
      ),
    );
  }

  Widget _buildTextContent(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 700),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 8),
          Text(
            'BLoC (Business Logic Component) er et arkitekturmønster der adskiller forretningslogik fra UI ved hjælp af streams og events.',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontSize: 20,
                  height: 1.5,
                ),
            textAlign: TextAlign.left,
          ),
          const SizedBox(height: 32),
          _buildSection(
            context,
            title: 'Event',
            icon: Icons.input,
            color: Colors.orange,
            description:
                'Input til BLoC. Repræsenterer brugerhandlinger eller systemhændelser (fx LoadData, RefreshData).',
          ),
          _buildSection(
            context,
            title: 'BLoC',
            icon: Icons.settings,
            color: Colors.purple,
            description:
                'Indeholder al forretningslogik. Modtager events, behandler dem, og emitter states. Kommunikerer med repositories/services.',
          ),
          _buildSection(
            context,
            title: 'State',
            icon: Icons.output,
            color: Colors.green,
            description:
                'Output fra BLoC. Repræsenterer UI-tilstanden (fx Loading, Loaded, Error).',
          ),
          _buildSection(
            context,
            title: 'View',
            icon: Icons.remove_red_eye,
            color: Colors.indigo,
            description:
                'UI-laget der lytter til states via BlocBuilder og sender events via context.read<BLoC>().add().',
          ),
          const SizedBox(height: 32),
          _buildAdvantagesCard(context),
        ],
      ),
    );
  }

  Widget _buildSection(
    BuildContext context, {
    required String title,
    required IconData icon,
    required Color color,
    required String description,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    color: color,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: const TextStyle(fontSize: 15, height: 1.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAdvantagesCard(BuildContext context) {
    return Card(
      elevation: 3,
      color: Colors.green[50],
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.star, color: Colors.green, size: 28),
                const SizedBox(width: 8),
                Text(
                  'Fordele ved BLoC:',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildAdvantageItem('✅ Klar separation mellem UI og business logic'),
            _buildAdvantageItem('✅ Meget testbar - isoleret logik'),
            _buildAdvantageItem('✅ Genbrugeligt på tværs af platformen'),
            _buildAdvantageItem('✅ Reaktiv programmering med streams'),
            _buildAdvantageItem('✅ Forudsigelig state management'),
            _buildAdvantageItem('✅ Excellent til komplekse apps'),
          ],
        ),
      ),
    );
  }

  Widget _buildAdvantageItem(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Text(
        text,
        style: const TextStyle(fontSize: 15, height: 1.5),
      ),
    );
  }

  Widget _buildCodeExample(BuildContext context) {
    return Card(
      elevation: 3,
      color: Colors.grey[900],
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.code, color: Colors.white70, size: 24),
                const SizedBox(width: 8),
                Text(
                  'Eksempel: BLoC Brug',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 600),
                child: HighlightView(
                  '''// Dispatcher event til BLoC
context.read<ExampleBloc>()
  .add(LoadData());

// Lyt til state ændringer
BlocBuilder<ExampleBloc, ExampleState>(
  builder: (context, state) {
    if (state is ExampleLoading) {
      return CircularProgressIndicator();
    }
    if (state is ExampleLoaded) {
      return DataList(state.data);
    }
    return ErrorWidget(state.error);
  },
)''',
                  language: 'dart',
                  theme: vs2015Theme,
                  padding: const EdgeInsets.all(20),
                  textStyle: const TextStyle(
                    fontSize: 16,
                    height: 1.6,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
