import { useState } from 'react';
import { Save, Bell, Shield, Cpu, Sliders, Info, CheckCircle } from 'lucide-react';
import { IOT_FUNCTION_URL } from '../lib/supabase';

const SECTIONS = ['General', 'Notifications', 'IoT Devices', 'Contribution Logic', 'About'];

export default function Settings() {
  const [activeSection, setActiveSection] = useState('General');
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    projectName: 'Group Project Tracker',
    pollInterval: '3',
    fairnessMethod: 'stddev',
    highThreshold: '80',
    mediumThreshold: '50',
    notifyLowContribution: true,
    notifySessionEnd: true,
    notifyNewMember: false,
    requireFaceForHigh: true,
    voiceWeight: '60',
    faceWeight: '40',
    darkMode: false,
  });

  const update = (key: string, value: string | boolean) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const sectionIcons: Record<string, React.FC<{ size?: number; className?: string }>> = {
    General: Sliders,
    Notifications: Bell,
    'IoT Devices': Cpu,
    'Contribution Logic': Shield,
    About: Info,
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <nav className="space-y-1">
              {SECTIONS.map((s) => {
                const Icon = sectionIcons[s];
                return (
                  <button
                    key={s}
                    onClick={() => setActiveSection(s)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      activeSection === s ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={16} />
                    {s}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              {activeSection === 'General' && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">General Settings</h3>
                  <p className="text-sm text-gray-500 mb-6">Configure your project tracking preferences.</p>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                      <input
                        value={settings.projectName}
                        onChange={(e) => update('projectName', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Dashboard Poll Interval (seconds)</label>
                      <select
                        value={settings.pollInterval}
                        onChange={(e) => update('pollInterval', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        {['1', '3', '5', '10', '30'].map((v) => (
                          <option key={v} value={v}>{v} seconds</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Dark Mode</p>
                        <p className="text-xs text-gray-500">Switch to dark theme (coming soon)</p>
                      </div>
                      <button
                        onClick={() => update('darkMode', !settings.darkMode)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${settings.darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'Notifications' && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Notifications</h3>
                  <p className="text-sm text-gray-500 mb-6">Choose which events trigger alerts.</p>
                  <div className="space-y-3">
                    {[
                      { key: 'notifyLowContribution', label: 'Low Contribution Alert', desc: 'Alert when a member drops below LOW level' },
                      { key: 'notifySessionEnd', label: 'Session End', desc: 'Notify when a session is completed' },
                      { key: 'notifyNewMember', label: 'New Member Registration', desc: 'Alert when a new team member joins' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{item.label}</p>
                          <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => update(item.key, !settings[item.key as keyof typeof settings])}
                          className={`relative w-11 h-6 rounded-full transition-colors ${settings[item.key as keyof typeof settings] ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[item.key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'IoT Devices' && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">IoT Device Settings</h3>
                  <p className="text-sm text-gray-500 mb-6">Configure your IoT integration endpoint.</p>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-900 rounded-xl text-green-400 font-mono text-xs overflow-x-auto">
                      <p className="text-gray-400 mb-2"># API Endpoint</p>
                      <p>POST {IOT_FUNCTION_URL}</p>
                      <br />
                      <p className="text-gray-400 mb-2"># Payload</p>
                      <p>{'{'}</p>
                      <p className="pl-4">"device_id": "device_1",</p>
                      <p className="pl-4">"voice": 1,</p>
                      <p className="pl-4">"face": 1,</p>
                      <p className="pl-4">"session": "session-uuid"</p>
                      <p>{'}'}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                      <p className="font-semibold mb-1">How to use from an Arduino/Raspberry Pi:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
                        <li>Register your device ID in the Members page</li>
                        <li>Send a POST request to the endpoint above</li>
                        <li>Set voice=1 when microphone detects speech</li>
                        <li>Set face=1 when camera detects a face</li>
                        <li>Include the session UUID if tracking a specific session</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'Contribution Logic' && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Contribution Logic</h3>
                  <p className="text-sm text-gray-500 mb-6">Configure how contribution levels are computed.</p>
                  <div className="space-y-5">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm font-semibold text-gray-800 mb-3">Contribution Rules</p>
                      <div className="space-y-2 text-sm">
                        {[
                          { cond: 'voice=1 AND face=1', level: 'HIGH', pct: 100, color: 'text-green-600 bg-green-100' },
                          { cond: 'voice=1 AND face=0', level: 'MEDIUM', pct: 60, color: 'text-yellow-600 bg-yellow-100' },
                          { cond: 'voice=0', level: 'LOW', pct: 20, color: 'text-red-600 bg-red-100' },
                        ].map((r, i) => (
                          <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5">
                            <code className="text-xs font-mono text-gray-600 flex-1">{r.cond}</code>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.color}`}>{r.level}</span>
                            <span className="text-sm font-bold text-gray-900 w-12 text-right">{r.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Fairness Score Method</label>
                      <select
                        value={settings.fairnessMethod}
                        onChange={(e) => update('fairnessMethod', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="stddev">Standard Deviation (recommended)</option>
                        <option value="gini">Gini Coefficient</option>
                        <option value="range">Min-Max Range</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Voice Weight (%)</label>
                        <input
                          type="number" min="0" max="100"
                          value={settings.voiceWeight}
                          onChange={(e) => update('voiceWeight', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Face Weight (%)</label>
                        <input
                          type="number" min="0" max="100"
                          value={settings.faceWeight}
                          onChange={(e) => update('faceWeight', e.target.value)}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'About' && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">About ContribuTrack</h3>
                  <p className="text-sm text-gray-500 mb-6">IoT + AI Group Contribution Tracker</p>
                  <div className="space-y-4 text-sm text-gray-600">
                    <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                      {[
                        ['Version', '1.0.0'],
                        ['Stack', 'React + Vite + Tailwind + Supabase'],
                        ['IoT API', 'Supabase Edge Functions'],
                        ['Real-time', 'Supabase Realtime + 3s polling'],
                        ['Charts', 'Custom SVG'],
                      ].map(([k, v], i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-gray-500">{k}</span>
                          <span className="font-medium text-gray-800">{v}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      ContribuTrack addresses the challenge: "How Might We Ensure Fair Participation in Group Projects by
                      Tracking Contribution?" — using IoT sensors (microphones, cameras) to objectively measure voice
                      participation and physical presence, combined with document analysis for written contributions.
                    </p>
                  </div>
                </div>
              )}

              {/* Save button */}
              {activeSection !== 'About' && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    {saved ? <CheckCircle size={16} /> : <Save size={16} />}
                    {saved ? 'Saved!' : 'Save Settings'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
