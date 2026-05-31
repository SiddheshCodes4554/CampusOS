import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { data: goals, error } = await supabase
      .from('academic_goals')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(goals || [])
  } catch (err: unknown) {
    console.warn('Goals DB read failed, returning empty list:', err instanceof Error ? err.message : err)
    // Return empty list so client can fallback to Local Storage
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { title, category, targetValue, deadlineDate } = await request.json()

    if (!title || !category || targetValue === undefined || !deadlineDate) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 })
    }

    const targetVal = parseFloat(targetValue)
    if (isNaN(targetVal) || targetVal <= 0) {
      return NextResponse.json({ error: 'Target value must be a positive number.' }, { status: 400 })
    }

    const { data: newGoal, error } = await supabase
      .from('academic_goals')
      .insert({
        user_id: user.id,
        title,
        category,
        target_value: targetVal,
        current_value: 0.00,
        deadline_date: deadlineDate,
        completed: false
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(newGoal)
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Database error.'
    console.error('Goal creation API error:', err)
    return NextResponse.json({ error: errMsg, isFallback: true }, { status: 200 }) // Return indicator for client LocalStorage fallback
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { id, currentValue, completed } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required.' }, { status: 400 })
    }

    const updateFields: Record<string, unknown> = {}
    if (currentValue !== undefined) updateFields.current_value = parseFloat(currentValue)
    if (completed !== undefined) updateFields.completed = completed

    const { data: updatedGoal, error } = await supabase
      .from('academic_goals')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(updatedGoal)
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Database error.'
    console.error('Goal update API error:', err)
    return NextResponse.json({ error: errMsg, isFallback: true }, { status: 200 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('academic_goals')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Database error.'
    console.error('Goal deletion API error:', err)
    return NextResponse.json({ error: errMsg, isFallback: true }, { status: 200 })
  }
}
