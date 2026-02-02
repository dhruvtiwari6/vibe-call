'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams, redirect } from 'next/navigation'

function ErrorComponent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    useEffect(() => {
        if (error === 'AccessDenied') {
            redirect('/sign-up')
        }
    }, [error])

    return (
        <div>An unexpected error occured please try again .... {error}</div>
    )
}

export default function ErrorPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ErrorComponent />
        </Suspense>
    )
}