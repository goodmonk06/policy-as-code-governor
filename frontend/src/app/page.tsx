'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PolicySet {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  rules: PolicyRule[];
  _count?: {
    evaluationLogs: number;
  };
}

interface PolicyRule {
  id: string;
  name: string;
  description: string | null;
  effect: 'ALLOW' | 'DENY';
  conditionJson: unknown;
  priority: number;
}

interface EvaluationResult {
  decision: 'ALLOW' | 'DENY';
  matchedRules: Array<{
    ruleId: string;
    ruleName: string;
    effect: 'ALLOW' | 'DENY';
    priority: number;
  }>;
  evaluatedAt: string;
}

export default function Home() {
  const [policySets, setPolicySets] = useState<PolicySet[]>([]);
  const [selectedPolicySet, setSelectedPolicySet] = useState<PolicySet | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'test'>('list');

  // Create form state
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyDescription, setNewPolicyDescription] = useState('');
  const [newPolicyRules, setNewPolicyRules] = useState('[]');

  // Test form state
  const [testContext, setTestContext] = useState('{}');
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicySets();
  }, []);

  const fetchPolicySets = async () => {
    try {
      const response = await fetch(`${API_URL}/policy-sets`);
      const data = await response.json();
      setPolicySets(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch policy sets:', error);
      setLoading(false);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const rules = JSON.parse(newPolicyRules);

      const response = await fetch(`${API_URL}/policy-sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPolicyName,
          description: newPolicyDescription || undefined,
          rules
        })
      });

      if (response.ok) {
        setNewPolicyName('');
        setNewPolicyDescription('');
        setNewPolicyRules('[]');
        setActiveTab('list');
        fetchPolicySets();
      } else {
        const error = await response.json();
        alert(`Failed to create policy: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestError(null);
    setEvaluationResult(null);

    if (!selectedPolicySet) {
      setTestError('Please select a policy set first');
      return;
    }

    try {
      const context = JSON.parse(testContext);

      const response = await fetch(`${API_URL}/policy-sets/${selectedPolicySet.id}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context })
      });

      if (response.ok) {
        const result = await response.json();
        setEvaluationResult(result);
      } else {
        const error = await response.json();
        setTestError(`Evaluation failed: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      setTestError(`Error: ${error}`);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy set?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/policy-sets/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchPolicySets();
        if (selectedPolicySet?.id === id) {
          setSelectedPolicySet(null);
        }
      }
    } catch (error) {
      alert(`Failed to delete policy: ${error}`);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading policy sets...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Policy Sets ({policySets.length})
        </button>
        <button
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create New
        </button>
        <button
          className={`tab ${activeTab === 'test' ? 'active' : ''}`}
          onClick={() => setActiveTab('test')}
        >
          Test Evaluation
        </button>
      </div>

      {activeTab === 'list' && (
        <div className="card">
          <h2>Policy Sets</h2>

          {policySets.length === 0 ? (
            <p className="text-center" style={{ padding: '40px', color: '#95a5a6' }}>
              No policy sets found. Create one to get started!
            </p>
          ) : (
            <ul className="policy-list">
              {policySets.map((policySet) => (
                <li
                  key={policySet.id}
                  className="policy-item"
                  onClick={() => setSelectedPolicySet(policySet)}
                >
                  <div className="flex-between">
                    <div>
                      <h3>{policySet.name}</h3>
                      {policySet.description && <p>{policySet.description}</p>}
                      <div className="policy-meta">
                        <span>{policySet.rules.length} rules</span>
                        <span>{policySet._count?.evaluationLogs || 0} evaluations</span>
                        <span>{new Date(policySet.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      className="button button-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePolicy(policySet.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {selectedPolicySet && (
            <div className="card mt-20">
              <h2>Policy Details: {selectedPolicySet.name}</h2>
              <p style={{ marginBottom: '15px', color: '#7f8c8d' }}>
                {selectedPolicySet.description || 'No description'}
              </p>

              <h3>Rules ({selectedPolicySet.rules.length})</h3>
              <div style={{ marginTop: '10px' }}>
                {selectedPolicySet.rules.map((rule) => (
                  <div key={rule.id} style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                    <div className="flex-between" style={{ marginBottom: '5px' }}>
                      <strong>{rule.name}</strong>
                      <span className={`badge badge-${rule.effect.toLowerCase()}`}>
                        {rule.effect}
                      </span>
                    </div>
                    {rule.description && (
                      <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '8px' }}>
                        {rule.description}
                      </p>
                    )}
                    <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '8px' }}>
                      Priority: {rule.priority}
                    </div>
                    <pre className="code-block">
                      {JSON.stringify(rule.conditionJson, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="card">
          <h2>Create New Policy Set</h2>
          <form onSubmit={handleCreatePolicy}>
            <div className="form-group">
              <label>Policy Set Name *</label>
              <input
                type="text"
                value={newPolicyName}
                onChange={(e) => setNewPolicyName(e.target.value)}
                placeholder="e.g., User Access Control"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={newPolicyDescription}
                onChange={(e) => setNewPolicyDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="form-group">
              <label>Rules (JSON) *</label>
              <textarea
                value={newPolicyRules}
                onChange={(e) => setNewPolicyRules(e.target.value)}
                placeholder='[{"name": "Rule Name", "effect": "ALLOW", "conditionJson": {...}, "priority": 10}]'
                style={{ minHeight: '200px' }}
                required
              />
              <small style={{ color: '#7f8c8d', fontSize: '12px' }}>
                Enter rules as a JSON array. Each rule must have: name, effect (ALLOW/DENY), conditionJson, and priority.
              </small>
            </div>

            <div className="flex gap-10">
              <button type="submit" className="button button-success">
                Create Policy Set
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setNewPolicyName('');
                  setNewPolicyDescription('');
                  setNewPolicyRules('[]');
                }}
              >
                Clear
              </button>
            </div>
          </form>

          <div className="mt-20">
            <h3>Example Rule:</h3>
            <pre className="code-block">
{`[
  {
    "name": "Admin Access",
    "description": "Allow admins to perform any action",
    "effect": "ALLOW",
    "priority": 100,
    "conditionJson": {
      "equals": ["user.role", "admin"]
    }
  }
]`}
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'test' && (
        <div className="grid grid-2">
          <div className="card">
            <h2>Test Policy Evaluation</h2>

            <div className="form-group">
              <label>Select Policy Set *</label>
              <select
                value={selectedPolicySet?.id || ''}
                onChange={(e) => {
                  const ps = policySets.find(p => p.id === e.target.value);
                  setSelectedPolicySet(ps || null);
                }}
                required
              >
                <option value="">-- Select a policy set --</option>
                {policySets.map((ps) => (
                  <option key={ps.id} value={ps.id}>
                    {ps.name}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleEvaluate}>
              <div className="form-group">
                <label>Context (JSON) *</label>
                <textarea
                  value={testContext}
                  onChange={(e) => setTestContext(e.target.value)}
                  placeholder='{"user": {"role": "admin"}, "action": "delete"}'
                  style={{ minHeight: '150px' }}
                  required
                />
              </div>

              <button type="submit" className="button button-success" disabled={!selectedPolicySet}>
                Evaluate
              </button>
            </form>

            <div className="mt-20">
              <h3>Example Context:</h3>
              <pre className="code-block">
{`{
  "user": {
    "id": "user123",
    "role": "admin",
    "department": "engineering"
  },
  "action": "delete",
  "resource": {
    "type": "document",
    "owner": "user123"
  }
}`}
              </pre>
            </div>
          </div>

          <div className="card">
            <h2>Evaluation Result</h2>

            {testError && (
              <div className="alert alert-error">{testError}</div>
            )}

            {evaluationResult && (
              <div>
                <div className={`alert alert-${evaluationResult.decision === 'ALLOW' ? 'success' : 'error'}`}>
                  <strong>Decision: {evaluationResult.decision}</strong>
                </div>

                <h3>Matched Rules ({evaluationResult.matchedRules.length})</h3>
                {evaluationResult.matchedRules.length === 0 ? (
                  <p style={{ color: '#7f8c8d', padding: '10px' }}>No rules matched</p>
                ) : (
                  <div style={{ marginTop: '10px' }}>
                    {evaluationResult.matchedRules.map((rule, index) => (
                      <div key={index} style={{ marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                        <div className="flex-between">
                          <strong>{rule.ruleName}</strong>
                          <span className={`badge badge-${rule.effect.toLowerCase()}`}>
                            {rule.effect}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '5px' }}>
                          Priority: {rule.priority}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                  <small style={{ color: '#7f8c8d' }}>
                    Evaluated at: {new Date(evaluationResult.evaluatedAt).toLocaleString()}
                  </small>
                </div>
              </div>
            )}

            {!evaluationResult && !testError && (
              <p style={{ color: '#95a5a6', textAlign: 'center', padding: '40px' }}>
                Run an evaluation to see results
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
