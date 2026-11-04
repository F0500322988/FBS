import json,pathlib,shutil,subprocess,sys,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class PayloadVerification(unittest.TestCase):
 def setUp(self):
  self.work=pathlib.Path(tempfile.mkdtemp(prefix='fbs-m175-payload-test-'));self.app=self.work/'FBS Classroom Student.app';self.payload=self.work/'expanded'/'Payload'/self.app.name;self.report=self.work/'report.json'
  (self.app/'Contents').mkdir(parents=True);(self.app/'Contents'/'Info.plist').write_bytes(b'fixture');shutil.copytree(self.app,self.payload)
 def tearDown(self):shutil.rmtree(self.work)
 def run_check(self):return subprocess.run([sys.executable,str(ROOT/'verify-payload.py'),str(self.app),str(self.work/'expanded'),str(self.report)],capture_output=True,text=True)
 def test_exact_payload_passes(self):
  self.assertEqual(self.run_check().returncode,0);report=json.loads(self.report.read_text());self.assertEqual(report['filesVerified'],1);self.assertFalse(report['installExecuted'])
 def test_changed_bytes_fail(self):
  (self.payload/'Contents'/'Info.plist').write_bytes(b'changed');self.assertNotEqual(self.run_check().returncode,0);self.assertFalse(self.report.exists())
 def test_extra_file_fails(self):
  (self.payload/'extra').write_text('unexpected');self.assertNotEqual(self.run_check().returncode,0)
 def test_symlink_is_rejected(self):
  (self.payload/'outside').symlink_to(self.work);self.assertNotEqual(self.run_check().returncode,0)
 def test_missing_app_fails(self):
  shutil.rmtree(self.payload);self.assertNotEqual(self.run_check().returncode,0)
if __name__=='__main__':unittest.main()
