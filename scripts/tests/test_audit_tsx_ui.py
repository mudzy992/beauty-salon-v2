import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('audit_tsx_ui', Path(__file__).resolve().parents[1] / 'audit_tsx_ui.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class InventoryTest(unittest.TestCase):
    def test_all_tsx_and_import_graph_and_candidate_types(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name, content in {
                'app/routes/admin.routes.tsx': "import('../../pages/Admin')",
                'pages/Admin.tsx': "import { Card } from '../components/Card'\nconst x = <div className=\"bg-slate-950 rounded-lg\" />\nconst t = <table />\nconst h = <h1 />",
                'pages/public/Public.tsx': "import { Card } from '../../components/Card'",
                'components/Card.tsx': "export const Card = () => <div style={{color: '#fff'}} />",
                'features/stylist-portal/pages/View.tsx': '<div className="text-red-500" />',
                'pages/Orphan.tsx': 'const x = <div />',
            }.items():
                file = root / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(content)
            records = {r['file']: r for r in audit.audit(root)}
            self.assertEqual(set(records), {'app/routes/admin.routes.tsx', 'pages/Admin.tsx', 'pages/public/Public.tsx', 'components/Card.tsx', 'features/stylist-portal/pages/View.tsx', 'pages/Orphan.tsx'})
            self.assertEqual(records['components/Card.tsx']['scope'], ['admin', 'public'])
            self.assertEqual(records['pages/Orphan.tsx']['scope'], ['unclassified'])
            self.assertEqual(records['features/stylist-portal/pages/View.tsx']['scope'], ['stylist'])
            self.assertTrue({'direct-color', 'surface-candidate', 'raw-table', 'local-heading'} <= {f['category'] for f in records['pages/Admin.tsx']['findings']})
            self.assertTrue({'literal-color', 'inline-style'} <= {f['category'] for f in records['components/Card.tsx']['findings']})


if __name__ == '__main__':
    unittest.main()
