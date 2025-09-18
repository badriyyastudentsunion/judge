// Initialize Supabase - REPLACE WITH YOUR ACTUAL ANON KEY
const SUPABASE_URL = 'https://fxeqsqxjawtytrexjmnt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZXFzcXhqYXd0eXRyZXhqbW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxODMwMDEsImV4cCI6MjA3Mzc1OTAwMX0.cH5xkROVAWGH8x9Q1YMaitSoISwvx9YurHM4wOL-xZI'; // REPLACE THIS!

// Fix: Use different variable name to avoid conflict
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentCompetition = null;

// Utility Functions
function showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="${isError ? 'error' : 'success'}">${message}</div>`;
        setTimeout(() => {
            if (element) element.innerHTML = '';
        }, 5000);
    }
}

function hideAllScreens() {
    const screens = ['loginScreen', 'adminPanel', 'judgePanel'];
    screens.forEach(screenId => {
        const element = document.getElementById(screenId);
        if (element) element.classList.add('hidden');
    });
}

function hideAllForms() {
    const forms = ['addUserForm', 'addCompetitionForm', 'competitionsView'];
    forms.forEach(formId => {
        const element = document.getElementById(formId);
        if (element) element.classList.add('hidden');
    });
}

function generateParticipantCodes(count) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        codes.push(String.fromCharCode(65 + i)); // A, B, C, D...
    }
    return codes;
}

// Show login screen directly
function showLoginScreen() {
    hideAllScreens();
    document.getElementById('loginScreen').classList.remove('hidden');
}

// Authentication Functions
async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    // Clear previous messages
    document.getElementById('loginMessage').innerHTML = '';

    if (!username || !password) {
        showMessage('loginMessage', 'Please fill in all fields', true);
        return;
    }

    try {
        console.log('Attempting login:', { username, password: '***' });
        
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        console.log('Login result:', { users, error });

        if (error || !users) {
            showMessage('loginMessage', 'Invalid username or password', true);
            return;
        }

        currentUser = users;
        console.log('Login successful, user role:', users.role);
        
        if (users.role === 'admin') {
            await loadAdminPanel();
        } else {
            await loadJudgePanel();
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage('loginMessage', 'Login failed. Please try again.', true);
    }
}

function logout() {
    currentUser = null;
    currentCompetition = null;
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    hideAllForms();
    showLoginScreen();
}

// Admin Functions
async function loadAdminPanel() {
    hideAllScreens();
    hideAllForms();
    document.getElementById('adminPanel').classList.remove('hidden');
    document.getElementById('adminUsername').textContent = currentUser.username;
    await loadJudgesForSelect();
}

async function loadJudgesForSelect() {
    try {
        const { data: judges, error } = await supabaseClient
            .from('users')
            .select('id, username')
            .eq('role', 'judge')
            .order('username');

        if (error) throw error;

        const judgeSelect = document.getElementById('judgeSelect');
        judgeSelect.innerHTML = '<option value="">Select Judge</option>';
        
        judges.forEach(judge => {
            judgeSelect.innerHTML += `<option value="${judge.id}">${judge.username}</option>`;
        });
    } catch (error) {
        console.error('Error loading judges:', error);
        showMessage('adminMessage', 'Error loading judges', true);
    }
}

function showAddUser() {
    hideAllForms();
    document.getElementById('addUserForm').classList.remove('hidden');
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('adminMessage').innerHTML = '';
}

function showAddCompetition() {
    hideAllForms();
    document.getElementById('addCompetitionForm').classList.remove('hidden');
    document.getElementById('competitionName').value = '';
    document.getElementById('category').value = '';
    document.getElementById('totalParticipants').value = '';
    document.getElementById('judgeSelect').value = '';
    document.getElementById('adminMessage').innerHTML = '';
    loadJudgesForSelect();
}

async function showCompetitions() {
    hideAllForms();
    document.getElementById('competitionsView').classList.remove('hidden');
    document.getElementById('adminMessage').innerHTML = '';
    await loadAdminCompetitions();
}

async function addUser() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value.trim();

    if (!username || !password) {
        showMessage('adminMessage', 'Please fill in all fields', true);
        return;
    }

    if (username.length < 3) {
        showMessage('adminMessage', 'Username must be at least 3 characters', true);
        return;
    }

    if (password.length < 6) {
        showMessage('adminMessage', 'Password must be at least 6 characters', true);
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('users')
            .insert([{ username, password, role: 'judge' }])
            .select()
            .single();

        if (error) throw error;

        showMessage('adminMessage', `✅ Judge "${username}" added successfully!`);
        document.getElementById('newUsername').value = '';
        document.getElementById('newPassword').value = '';
        await loadJudgesForSelect();
    } catch (error) {
        console.error('Error adding judge:', error);
        let errorMessage = 'Error adding judge.';
        if (error.message.includes('duplicate')) {
            errorMessage = 'Username already exists. Please choose a different username.';
        }
        showMessage('adminMessage', errorMessage, true);
    }
}

async function createCompetition() {
    const name = document.getElementById('competitionName').value.trim();
    const category = document.getElementById('category').value.trim();
    const totalParticipants = parseInt(document.getElementById('totalParticipants').value);
    const judgeId = document.getElementById('judgeSelect').value;

    if (!name || !category || !totalParticipants || !judgeId) {
        showMessage('adminMessage', 'Please fill in all fields', true);
        return;
    }

    if (totalParticipants > 26 || totalParticipants < 1) {
        showMessage('adminMessage', 'Participants must be between 1-26 (limited by alphabet)', true);
        return;
    }

    try {
        // Create competition
        const { data: competition, error: compError } = await supabaseClient
            .from('competitions')
            .insert([{ 
                name: name, 
                category: category, 
                total_participants: totalParticipants, 
                judge_id: judgeId 
            }])
            .select()
            .single();

        if (compError) throw compError;

        // Create participants with code letters
        const codes = generateParticipantCodes(totalParticipants);
        const participants = codes.map(code => ({
            competition_id: competition.id,
            code_letter: code
        }));

        const { error: partError } = await supabaseClient
            .from('participants')
            .insert(participants);

        if (partError) throw partError;

        showMessage('adminMessage', `✅ Competition "${name}" created with ${totalParticipants} participants (${codes.join(', ')})!`);
        
        // Clear form
        document.getElementById('competitionName').value = '';
        document.getElementById('category').value = '';
        document.getElementById('totalParticipants').value = '';
        document.getElementById('judgeSelect').value = '';

    } catch (error) {
        console.error('Error creating competition:', error);
        showMessage('adminMessage', 'Error creating competition. Please try again.', true);
    }
}

async function loadAdminCompetitions() {
    try {
        const { data: competitions, error } = await supabaseClient
            .from('competitions')
            .select(`
                *,
                users:judge_id (username),
                participants (id, code_letter, score, is_scored)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const container = document.getElementById('adminCompetitionsList');
        container.innerHTML = '';

        if (competitions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No competitions created yet.</p>';
            return;
        }

        competitions.forEach(comp => {
            const scoredCount = comp.participants.filter(p => p.is_scored).length;
            const totalCount = comp.participants.length;
            const progress = totalCount > 0 ? (scoredCount / totalCount) * 100 : 0;

            container.innerHTML += `
                <div class="competition-card">
                    <h4 style="color: #333; margin-bottom: 15px;">${comp.name}</h4>
                    <p><strong>Category:</strong> ${comp.category}</p>
                    <p><strong>Judge:</strong> ${comp.users?.username || 'Not assigned'}</p>
                    <p><strong>Participants:</strong> ${comp.participants.map(p => p.code_letter).join(', ')}</p>
                    <p><strong>Progress:</strong> ${scoredCount}/${totalCount} participants scored</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <small style="color: #666;">Created: ${new Date(comp.created_at).toLocaleDateString()}</small>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading competitions:', error);
        showMessage('adminMessage', 'Error loading competitions', true);
    }
}

// Judge Functions
async function loadJudgePanel() {
    hideAllScreens();
    document.getElementById('judgePanel').classList.remove('hidden');
    document.getElementById('judgeUsername').textContent = currentUser.username;
    showJudgeCompetitionsList();
    await loadJudgeCompetitionsList();
}

function showJudgeCompetitionsList() {
    document.getElementById('judgeCompetitionsList').classList.remove('hidden');
    document.getElementById('judgeCompetitionDetail').classList.add('hidden');
    document.getElementById('judgeMessage').innerHTML = '';
    currentCompetition = null;
}

function showJudgeCompetitionDetail(competition) {
    document.getElementById('judgeCompetitionsList').classList.add('hidden');
    document.getElementById('judgeCompetitionDetail').classList.remove('hidden');
    document.getElementById('judgeMessage').innerHTML = '';
    currentCompetition = competition;
    loadCompetitionDetail(competition);
}

async function loadJudgeCompetitionsList() {
    try {
        const { data: competitions, error } = await supabaseClient
            .from('competitions')
            .select(`
                *,
                participants (*)
            `)
            .eq('judge_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const container = document.getElementById('judgeCompetitionsContainer');
        container.innerHTML = '';

        if (competitions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No competitions assigned to you yet. Please contact admin.</p>';
            return;
        }

        competitions.forEach(comp => {
            const scoredCount = comp.participants.filter(p => p.is_scored).length;
            const totalCount = comp.participants.length;
            const allScored = comp.participants.every(p => p.is_scored);
            const progress = totalCount > 0 ? (scoredCount / totalCount) * 100 : 0;
            
            container.innerHTML += `
                <div class="competition-card competition-list-card" onclick="showJudgeCompetitionDetail(${JSON.stringify(comp).replace(/"/g, '&quot;')})">
                    <div class="competition-summary">
                        <h3 style="color: #333; margin: 0;">${comp.name}</h3>
                        <span class="status-badge ${allScored ? 'status-completed' : 'status-pending'}">
                            ${allScored ? '✅ Completed' : '⏳ Pending'}
                        </span>
                    </div>
                    
                    <p><strong>Category:</strong> ${comp.category}</p>
                    <p><strong>Participants:</strong> ${comp.participants.map(p => p.code_letter).join(', ')}</p>
                    <p><strong>Progress:</strong> ${scoredCount}/${totalCount} participants scored</p>
                    
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    
                    <div class="competition-meta">
                        <small>Created: ${new Date(comp.created_at).toLocaleDateString()}</small>
                    </div>
                    
                    <p class="click-hint">👆 Click to start judging</p>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading judge competitions:', error);
        showMessage('judgeMessage', 'Error loading competitions', true);
    }
}

function loadCompetitionDetail(comp) {
    const scoredCount = comp.participants.filter(p => p.is_scored).length;
    const totalCount = comp.participants.length;
    const allScored = comp.participants.every(p => p.is_scored);
    const progress = totalCount > 0 ? (scoredCount / totalCount) * 100 : 0;
    
    const container = document.getElementById('competitionDetailContent');
    container.innerHTML = `
        <div class="competition-card competition-detail-card">
            <div class="competition-summary">
                <h2 style="color: #333; margin: 0;">${comp.name}</h2>
                <span class="status-badge ${allScored ? 'status-completed' : 'status-pending'}">
                    ${allScored ? '✅ All Scored' : '⏳ In Progress'}
                </span>
            </div>
            
            <div style="margin: 20px 0;">
                <p><strong>Category:</strong> ${comp.category}</p>
                <p><strong>Total Participants:</strong> ${comp.total_participants}</p>
                <p><strong>Progress:</strong> ${scoredCount}/${totalCount} participants scored</p>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            
            <h3 style="margin: 30px 0 20px 0;">Score Participants</h3>
            <div id="participants-${comp.id}" style="margin: 20px 0;">
                ${comp.participants.map(participant => `
                    <div class="participant-row">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <span style="font-weight: 600; font-size: 18px; min-width: 120px;">
                                Participant ${participant.code_letter}
                            </span>
                            <input type="number" 
                                   class="score-input" 
                                   id="score-${participant.id}"
                                   min="0" max="100" 
                                   value="${participant.score || ''}"
                                   placeholder="0-100"
                                   ${participant.is_scored ? 'readonly style="background: #e9ecef;"' : ''}>
                        </div>
                        <span style="color: ${participant.is_scored ? '#28a745' : '#ffc107'}; font-weight: 500; font-size: 16px;">
                            ${participant.is_scored ? '✓ Scored' : '⏳ Pending'}
                        </span>
                    </div>
                `).join('')}
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <button class="btn btn-success ${allScored ? 'btn-secondary' : ''}" 
                        onclick="submitCompetitionScores('${comp.id}')"
                        ${allScored ? 'disabled' : ''}
                        style="padding: 15px 30px; font-size: 18px;">
                    ${allScored ? '✅ All Participants Scored' : '📝 Submit All Scores'}
                </button>
            </div>
        </div>
    `;
}

async function submitCompetitionScores(competitionId) {
    try {
        // Get competition participants
        const { data: participants, error: fetchError } = await supabaseClient
            .from('participants')
            .select('*')
            .eq('competition_id', competitionId);

        if (fetchError) throw fetchError;

        let hasInvalidScore = false;
        let emptyScores = 0;
        let updatesNeeded = [];

        participants.forEach(participant => {
            const scoreInput = document.getElementById(`score-${participant.id}`);
            const scoreValue = scoreInput.value.trim();
            
            if (scoreValue === '') {
                emptyScores++;
                return;
            }
            
            const score = parseInt(scoreValue);
            
            if (isNaN(score) || score < 0 || score > 100) {
                hasInvalidScore = true;
                return;
            }
            
            if (!participant.is_scored || participant.score !== score) {
                updatesNeeded.push({
                    id: participant.id,
                    score: score
                });
            }
        });

        if (emptyScores > 0) {
            showMessage('judgeMessage', `❌ Please fill in scores for all participants. ${emptyScores} score(s) missing.`, true);
            return;
        }

        if (hasInvalidScore) {
            showMessage('judgeMessage', '❌ Please ensure all scores are between 0-100', true);
            return;
        }

        if (updatesNeeded.length === 0) {
            showMessage('judgeMessage', '✅ All participants already have the same scores', false);
            return;
        }

        console.log('Updating participants:', updatesNeeded);

        // Update each participant individually
        for (const update of updatesNeeded) {
            const { error } = await supabaseClient
                .from('participants')
                .update({ 
                    score: update.score, 
                    is_scored: true 
                })
                .eq('id', update.id);
                
            if (error) throw error;
        }

        showMessage('judgeMessage', `✅ Successfully submitted scores for ${updatesNeeded.length} participants!`);
        
        // Reload current competition with updated data
        const { data: updatedCompetition, error: reloadError } = await supabaseClient
            .from('competitions')
            .select(`
                *,
                participants (*)
            `)
            .eq('id', competitionId)
            .single();
            
        if (!reloadError && updatedCompetition) {
            currentCompetition = updatedCompetition;
            loadCompetitionDetail(updatedCompetition);
        }
        
    } catch (error) {
        console.error('Error submitting scores:', error);
        showMessage('judgeMessage', '❌ Error submitting scores. Please try again.', true);
    }
}

// Handle Enter key for login
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        if (!document.getElementById('loginScreen').classList.contains('hidden')) {
            login();
        }
    }
});

// Initialize app when page loads - go directly to login
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized - showing login');
    showLoginScreen();
});
